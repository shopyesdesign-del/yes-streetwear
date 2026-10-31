const express    = require("express");
const fs         = require("fs");
const multer     = require("multer");
const path       = require("path");
const os         = require("os");
const crypto     = require("crypto");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const { MongoClient } = require("mongodb");
const { Pool } = require("pg");
const { attachDatabasePool } = require("@vercel/functions");

// ── MongoDB ────────────────────────────────────────────────────
let _db = null;
let _dbConnecting = null;

async function tryConnect(uri, opts) {
  const client = new MongoClient(uri, opts);
  await client.connect();
  return client.db("yesdesign");
}

async function getDb() {
  if (_db) return _db;
  if (_dbConnecting) return _dbConnecting;
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  const BASE = { maxPoolSize: 1, serverSelectionTimeoutMS: 6000, connectTimeoutMS: 6000 };
  // Try four escalating options to beat SSL/TLS issues on Vercel
  const variants = [
    { ...BASE, family: 4 },                                          // 1. IPv4
    { ...BASE },                                                      // 2. default (IPv6 allowed)
    { ...BASE, family: 4, tlsAllowInvalidCertificates: true },       // 3. skip cert check, IPv4
    { ...BASE, tlsAllowInvalidCertificates: true },                  // 4. skip cert check
  ];

  _dbConnecting = (async () => {
    for (let i = 0; i < variants.length; i++) {
      try {
        _db = await tryConnect(uri, variants[i]);
        console.log(`[db] connected (variant ${i + 1})`);
        return _db;
      } catch (e) {
        console.error(`[db] variant ${i + 1} failed:`, e.message.slice(0, 120));
        if (i < variants.length - 1) await new Promise(r => setTimeout(r, 300));
      }
    }
    console.error("[db] all connection variants failed");
    return null;
  })();

  const result = await _dbConnecting;
  _dbConnecting = null;
  return result;
}

async function dbGet(key, fallback) {
  try {
    const db = await getDb();
    if (!db) return fallback;
    const doc = await db.collection("store").findOne({ _id: key });
    return doc ? doc.data : fallback;
  } catch (_) { return fallback; }
}

async function dbSet(key, data) {
  try {
    const db = await getDb();
    if (!db) return false;
    await db.collection("store").updateOne(
      { _id: key },
      { $set: { data } },
      { upsert: true }
    );
    _ttlCache[key] = { data, ts: Date.now() }; // keep cache in sync after write
    return true;
  } catch (e) {
    console.error("[dbSet] failed for key", key, ":", e.message);
    return false;
  }
}

// ── TTL cache: serve from memory, background-refresh after 8s ──────────────
const _ttlCache = {};
const CACHE_TTL = 8000;

async function dbGetCached(key) {
  const entry = _ttlCache[key];
  const now   = Date.now();
  if (entry && (now - entry.ts) < CACHE_TTL) return entry.data; // cache hit
  // Cache miss or stale — fetch from MongoDB
  const fresh = await dbGet(key, null);
  if (fresh !== null) _ttlCache[key] = { data: fresh, ts: now };
  return fresh;
}

// On Vercel the filesystem is read-only — writes are silently skipped
function safeWrite(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (_) {}
}


const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const TOP_N = 10;
const MAX_LEADERBOARD_SCORE = 10000000;
let _leaderboardPool = null;
let _leaderboardPoolPromise = null;
let _leaderboardFailureCode = "database_config_missing";

function getLeaderboardFailureCode(error) {
  const code = error?.code;
  if (code === "28P01" || code === "28000") return "database_auth_failed";
  if (code === "3D000") return "database_not_found";
  if (code === "42P01") return "leaderboard_table_missing";
  if (code === "42501") return "database_permission_denied";
  if (code === "42703") return "leaderboard_schema_mismatch";
  if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(code))
    return "database_connection_failed";
  return "database_unavailable";
}

function logLeaderboardError(action, error) {
  console.error(`[leaderboard] ${action} failed`, {
    code: error?.code || "UNKNOWN",
    message: typeof error?.message === "string" ? error.message.slice(0, 200) : "Unknown database error",
  });
}

async function getLeaderboardPool() {
  if (_leaderboardPool) return _leaderboardPool;
  if (_leaderboardPoolPromise) return _leaderboardPoolPromise;

  const seenUrls = new Set();
  const connectionCandidates = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
    ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
  ].filter(([, connectionString]) => {
    if (typeof connectionString !== "string" || !connectionString || seenUrls.has(connectionString)) return false;
    seenUrls.add(connectionString);
    return true;
  }).map(([envName, connectionString]) => [envName, { connectionString }]);

  const host = process.env.PGHOST || process.env.POSTGRES_HOST || process.env.PGHOST_UNPOOLED;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DATABASE;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;

  if (host && database && user && password) {
    connectionCandidates.push([
      "PGHOST/PGDATABASE credentials",
      {
        host,
        port: Number(process.env.PGPORT || process.env.POSTGRES_PORT) || 5432,
        database,
        user,
        password,
        ssl: true,
      },
    ]);
  }

  if (!connectionCandidates.length) {
    _leaderboardFailureCode = "database_config_missing";
    console.error("[leaderboard] no database connection settings are configured");
    return null;
  }

  _leaderboardPoolPromise = (async () => {
    for (const [envName, connectionConfig] of connectionCandidates) {
      const pool = new Pool({
        ...connectionConfig,
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });

      try {
        if (process.env.VERCEL) attachDatabasePool(pool);
        await pool.query("SELECT 1 FROM public.money_jump_scores LIMIT 0");
        _leaderboardPool = pool;
        _leaderboardFailureCode = null;
        return pool;
      } catch (error) {
        _leaderboardFailureCode = getLeaderboardFailureCode(error);
        logLeaderboardError(`connection via ${envName}`, error);
        await pool.end().catch(() => {});
      }
    }

    return null;
  })();

  try {
    return await _leaderboardPoolPromise;
  } finally {
    _leaderboardPoolPromise = null;
  }
}

function normalizePlayerName(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/gu, " ").trim();
}

async function queryLeaderboard(pool, playerNameKey = null) {
  const { rows } = await pool.query(
    `WITH ranked_scores AS (
      SELECT name_key, player_name AS name, score,
        ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, name_key ASC) AS rank
      FROM public.money_jump_scores
    )
    SELECT name, score, rank
    FROM ranked_scores
    WHERE rank <= $1 OR ($2::text IS NOT NULL AND name_key = $2)
    ORDER BY rank`,
    [TOP_N, playerNameKey]
  );
  return rows.map(row => ({ ...row, rank: Number(row.rank) }));
}

function sendLeaderboardUnavailable(res, message) {
  return res.status(503).json({
    error: message,
    code: _leaderboardFailureCode || "database_unavailable",
  });
}

app.get("/api/money-jump/scores", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const pool = await getLeaderboardPool();
    if (!pool) return sendLeaderboardUnavailable(res, "Rangliste momentan nicht verfügbar.");
    const requestedName = normalizePlayerName(req.query.name);
    const playerNameKey = requestedName && Array.from(requestedName).length <= 12
      ? requestedName.toLowerCase()
      : null;
    return res.json({ scores: await queryLeaderboard(pool, playerNameKey) });
  } catch (error) {
    _leaderboardFailureCode = getLeaderboardFailureCode(error);
    logLeaderboardError("read", error);
    return sendLeaderboardUnavailable(res, "Rangliste momentan nicht verfügbar.");
  }
});

app.post("/api/money-jump/scores", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const rawName = req.body && req.body.name;
  const name = normalizePlayerName(rawName);
  const score = req.body && req.body.score;

  if (!name || Array.from(name).length > 12)
    return res.status(400).json({ error: "Name muss 1 bis 12 Zeichen lang sein." });
  if (!Number.isSafeInteger(score) || score < 0 || score > MAX_LEADERBOARD_SCORE)
    return res.status(400).json({ error: "Ungültiger Punktestand." });

  try {
    const pool = await getLeaderboardPool();
    if (!pool) return sendLeaderboardUnavailable(res, "Punktestand konnte nicht gespeichert werden.");
    await pool.query(
      "INSERT INTO public.money_jump_scores (name_key, player_name, score) VALUES ($1, $2, $3) ON CONFLICT (name_key) DO UPDATE SET player_name = EXCLUDED.player_name, score = GREATEST(money_jump_scores.score, EXCLUDED.score), updated_at = CASE WHEN EXCLUDED.score > money_jump_scores.score THEN NOW() ELSE money_jump_scores.updated_at END",
      [name.toLowerCase(), name, score]
    );
    return res.json({ scores: await queryLeaderboard(pool, name.toLowerCase()) });
  } catch (error) {
    _leaderboardFailureCode = getLeaderboardFailureCode(error);
    logLeaderboardError("write", error);
    return sendLeaderboardUnavailable(res, "Punktestand konnte nicht gespeichert werden.");
  }
});

// Fallback upload dir — on Vercel /var/task is read-only, always use /tmp there
const UPLOADS_DIR = (() => {
  if (!process.env.VERCEL) {
    const local = path.join(__dirname, "public/uploads");
    try { fs.mkdirSync(local, { recursive: true }); return local; } catch (_) {}
  }
  const tmp = path.join(os.tmpdir(), "dripvault-uploads");
  try { fs.mkdirSync(tmp, { recursive: true }); } catch (_) {}
  return tmp;
})();

// All uploads go through memory first, then either Cloudinary or local disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }); // 4 MB server guard

// Resolve Cloudinary config from env var or admin settings
function getCloudinaryConfig() {
  // Support standard CLOUDINARY_URL env var: cloudinary://api_key:api_secret@cloud_name
  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      return { cloud_name: url.hostname, api_key: url.username, api_secret: url.password };
    } catch (_) {}
  }
  const cfg = (loadSettings().cloudinary) || {};
  if (cfg.cloudName && cfg.apiKey && cfg.apiSecret)
    return { cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret };
  return null;
}

// Upload a file: 1) Cloudinary  2) MongoDB  3) local disk (dev only)
async function uploadFile(file) {
  // 1. Cloudinary
  const cfg = getCloudinaryConfig();
  if (cfg) {
    try {
      cloudinary.config(cfg);
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto", folder: "dripvault" },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(file.buffer);
      });
    } catch (e) {
      console.error("[upload] Cloudinary failed:", e.message);
    }
  }

  // 2. Write to disk immediately (fast, reliable within this instance)
  //    AND kick off a background MongoDB save — /uploads/:filename falls back to MongoDB
  const filename = crypto.randomBytes(16).toString("hex");
  const imgPayload = {
    data: file.buffer.toString("base64"),
    mime: file.mimetype || "image/jpeg",
    size: file.buffer.length,
    at: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  } catch (_) { /* /tmp might fail in some envs; MongoDB is the real store */ }
  // Background: store in MongoDB so other Vercel instances can serve the image
  dbSet("img_" + filename, imgPayload).catch(e =>
    console.error("[upload] bg mongo failed:", e.message)
  );
  return "/uploads/" + filename;
}

const CUSTOMER_PASS = "yes";
const ADMIN_PASS = "yes0511";

// Dateien
const PRODUCTS_FILE    = path.join(__dirname, "data.json");
const SETTINGS_FILE    = path.join(__dirname, "settings.json");
const ORDERS_FILE      = path.join(__dirname, "orders.json");
const COLLECTIONS_FILE = path.join(__dirname, "collections.json");

const defaultSettings = {
  shopTitle:       "DRIP VAULT",
  loginText:       "Welcome Back",
  layout:          "grid",
  fontMain:        "Inter",
  fontDisplay:     "Bangers",
  logo:            "",
  background:      "",
  loginBackground: "",
  theme: {
    bgColor:         "#0f0f0f",
    bgSecondary:     "#111111",
    cardColor:       "#1a1a1a",
    textColor:       "#ffffff",
    headingColor:    "#ffffff",
    accentColor:     "#ff2d55",
    buttonColor:     "#ff2d55",
    borderColor:     "#2a2a2a",
    bgImageEnabled:  false,
    bgSize:          "cover",
    bgPosition:      "center",
    overlayOpacity:  0,
  },
  heroBanner: {
    enabled:        true,
    title:          "DEIN TEXT HIER",
    subtitle:       "Deine Beschreibung",
    buttonText:     "Jetzt shoppen",
    image:          "",
    textColor:      "#ffffff",
    font:           "Bangers",
    overlayOpacity: 0,
  },
  buttonStyle: {
    text:          "In den Warenkorb",
    textColor:     "#ffffff",
    bgColor:       "#ff2d55",
    borderRadius:  6,
    fontSize:      13,
    fontWeight:    700,
    uppercase:     true,
    letterSpacing: 0.07,
    animation:     "none",
    shadow:        false,
    shadowColor:   "#ff2d55",
  },
  effects: {
    grain:            false,
    particles:        false,
    neonGlow:         false,
    cursor:           false,
    scrollAnimations: true,
    hoverGlow:        true,
    pageTransitions:  true,
  },
  visualEffects: {
    dollars:      { enabled: false, count: 15, opacity: 0.2,  speed: 1,   minSize: 24, maxSize: 56, color: "#4CAF50" },
    goldParticles:{ enabled: false, count: 40, opacity: 0.7,  speed: 0.4, size: 2.5 },
    confetti:     { enabled: false, count: 40, opacity: 0.9,  speed: 1.5 },
    glitch:       { enabled: false, frequency: 4, intensity: 1 },
    lightLeak:    { enabled: false, opacity: 0.12, speed: 8 },
    sparkle:      { enabled: false, count: 20, color: "#FFD700", size: 4, speed: 1 },
    cardTilt3D:   { enabled: false, intensity: 12, shine: true },
  },
  loginPage: {
    headline:         "DRIP VAULT",
    headlineFont:     "Bangers",
    headlineColor:    "#ffffff",
    headlineSize:     52,
    headlineAnim:     "none",
    subtitle:         "It's YES Baby",
    subtitleColor:    "#999999",
    subtitleSize:     14,
    bgColor:          "#0f0f0f",
    bgImage:          "",
    bgVideo:          "",
    bgOverlay:        0.45,
    logoUrl:          "",
    logoSize:         60,
    logoAnim:         "none",
    inputBg:          "rgba(255,255,255,0.07)",
    inputBorder:      "rgba(255,255,255,0.11)",
    inputTextColor:   "#ffffff",
    inputRadius:      14,
    inputPlaceholder: "Zugangscode eingeben",
    inputGlow:        "#ff2d55",
    inputGlowEnabled: true,
    inputShadow:      false,
    btnText:          "EINTRETEN",
    btnBg:            "#ff2d55",
    btnColor:         "#ffffff",
    btnRadius:        12,
    btnAnim:          "none",
    btnGlow:          false,
    btnGlowColor:     "#ff2d55",
    btnHoverBg:       "",
    btnIcon:          "",
    errorText:        "Falscher Code. Versuch es nochmal.",
    bgBlur:           0,
    bgBrightness:     1,
    vignette:         0.6,
    cameraMove:       false,
    pageReveal:       "fade",
    hintText:         "",
    hintColor:        "#555555",
    hintSize:         11,
    money: { enabled: true,  count: 12, speed: 0.6, size: 1.0, opacity: 0.22 },
    grain: { enabled: false, intensity: 0.35 },
  },
  passwords: {
    customer:        "yes",
    admin:           "yes0511",
    customerEnabled: true,
  },
  cursor: {
    enabled:      false,
    imageUrl:     "",
    useLogo:      true,
    size:         36,
    opacity:      0.9,
    animation:    "none",
    glowColor:    "#ff2d55",
    glowSize:     20,
    buttonScale:  1.6,
    productScale: 1.3,
  },
  payment: {
    paypalClientId:     "",
    paypalClientSecret: "",
    paypalMode:         "sandbox",
    paypalEnabled:      false,
    manualEnabled:      true,
    manualInstructions: "Bitte kontaktiere uns für Zahlungsdetails.",
    currency:           "EUR",
    shippingFree:       true,
    shippingCost:       4.99,
    freeShippingAbove:  0,
  },
  email: {
    enabled:      false,
    resendApiKey: "",
    emailLogo:    "",
    accentColor:  "#ff2d55",
    smtpHost:     "",
    smtpPort:     587,
    smtpSecure:   false,
    smtpUser:     "",
    smtpPass:     "",
    senderName:   "DRIP VAULT",
    senderEmail:  "",
    subject:      "Deine Bestellung {{orderId}} ist eingegangen 🛍",
    body:         "Hallo {{name}},\n\nvielen Dank für deine Bestellung!\n\nDeine Bestellnummer: {{orderId}}\nGesamtbetrag: {{total}}\nZahlungsart: {{paymentMethod}}\n\nArtikel:\n{{items}}\n\nLieferadresse:\n{{address}}\n\nWir melden uns, sobald deine Bestellung versendet wurde.\n\nBis bald,\nDein Team",
  },
  cloudinary: {
    cloudName:  "",
    apiKey:     "",
    apiSecret:  "",
  },
  categoryBanners: {
    enabled:   true,
    pageFont:  "Bangers",
    layout:    "side",
    hoverZoom: true,
    banner1: {
      slug:            "fashion",
      title:           "Fashion",
      subtitle:        "",
      ctaText:         "Entdecken →",
      image:           "",
      textColor:       "#ffffff",
      titleSize:       "large",
      bgPosition:      "center center",
      overlayStrength: 60,
    },
    banner2: {
      slug:            "design",
      title:           "Design",
      subtitle:        "",
      ctaText:         "Entdecken →",
      image:           "",
      textColor:       "#ffffff",
      titleSize:       "large",
      bgPosition:      "center center",
      overlayStrength: 60,
    },
  },
};

// ── In-memory store (loaded once at startup from MongoDB or files) ──
const _store = { products: null, settings: null, orders: null, collections: null };

async function initStore() {
  // Load from MongoDB into memory cache — GET endpoints always re-fetch from MongoDB
  // directly, so this cache is only a cold-start fallback for write routes.
  // Never seed/overwrite MongoDB here: a slow first connect would cause initStore
  // to fall back to stale file data and then overwrite real MongoDB data on the
  // second getDb() call inside the seed block.
  const [dbProducts, dbOrders, dbCollections, dbSettings] = await Promise.all([
    dbGet("products",    null),
    dbGet("orders",      null),
    dbGet("collections", null),
    dbGet("settings",    null),
  ]);

  const fileSettings = fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE)) : null;

  _store.products    = dbProducts    || (fs.existsSync(PRODUCTS_FILE)    ? JSON.parse(fs.readFileSync(PRODUCTS_FILE))    : []);
  _store.orders      = dbOrders      || (fs.existsSync(ORDERS_FILE)      ? JSON.parse(fs.readFileSync(ORDERS_FILE))      : []);
  _store.collections = dbCollections || (fs.existsSync(COLLECTIONS_FILE) ? JSON.parse(fs.readFileSync(COLLECTIONS_FILE)) : []);

  const dbIncomplete = !dbSettings || (!dbSettings.theme && !dbSettings.background);
  _store.settings    = (dbIncomplete && fileSettings) ? fileSettings : (dbSettings || fileSettings || {});
}

function mergeSettings(saved) {
  const dVE = defaultSettings.visualEffects;
  const sVE = (saved.visualEffects) || {};
  return {
    ...defaultSettings, ...saved,
    theme:       { ...defaultSettings.theme,       ...(saved.theme       || {}) },
    heroBanner:  { ...defaultSettings.heroBanner,  ...(saved.heroBanner  || {}) },
    buttonStyle: { ...defaultSettings.buttonStyle, ...(saved.buttonStyle || {}) },
    effects:     { ...defaultSettings.effects,     ...(saved.effects     || {}) },
    loginPage: (() => {
      const dLP = defaultSettings.loginPage;
      const sLP = saved.loginPage || {};
      return { ...dLP, ...sLP, money: { ...dLP.money, ...(sLP.money||{}) }, grain: { ...dLP.grain, ...(sLP.grain||{}) } };
    })(),
    passwords:   { ...defaultSettings.passwords,   ...(saved.passwords   || {}) },
    visualEffects: {
      dollars:       { ...dVE.dollars,       ...(sVE.dollars       || {}) },
      goldParticles: { ...dVE.goldParticles, ...(sVE.goldParticles || {}) },
      confetti:      { ...dVE.confetti,      ...(sVE.confetti      || {}) },
      glitch:        { ...dVE.glitch,        ...(sVE.glitch        || {}) },
      lightLeak:     { ...dVE.lightLeak,     ...(sVE.lightLeak     || {}) },
      sparkle:       { ...dVE.sparkle,       ...(sVE.sparkle       || {}) },
      cardTilt3D:    { ...dVE.cardTilt3D,    ...(sVE.cardTilt3D    || {}) },
    },
    cursor:     { ...defaultSettings.cursor,     ...(saved.cursor     || {}) },
    payment:    { ...defaultSettings.payment,    ...(saved.payment    || {}) },
    email:      { ...defaultSettings.email,      ...(saved.email      || {}) },
    cloudinary: { ...defaultSettings.cloudinary, ...(saved.cloudinary || {}) },
    categoryBanners: (() => {
      const dCB = defaultSettings.categoryBanners;
      const sCB = saved.categoryBanners || {};
      return {
        enabled:   sCB.enabled   !== undefined ? sCB.enabled   : dCB.enabled,
        pageFont:  sCB.pageFont  || dCB.pageFont,
        layout:    sCB.layout    || dCB.layout,
        hoverZoom: sCB.hoverZoom !== undefined ? sCB.hoverZoom : dCB.hoverZoom,
        banner1: { ...dCB.banner1, ...(sCB.banner1 || {}) },
        banner2: { ...dCB.banner2, ...(sCB.banner2 || {}) },
      };
    })(),
  };
}

// Start init early in background
const _ready = initStore().catch(err => console.error("[store] init failed:", err.message));

// Synchronous load from in-memory cache
function readFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file)); } catch (_) { return fallback; }
}
function loadProducts()    { return _store.products    ?? readFile(PRODUCTS_FILE,    []); }
function loadSettings()    { return mergeSettings(_store.settings ?? readFile(SETTINGS_FILE, {})); }
function loadOrders()      { return _store.orders      ?? readFile(ORDERS_FILE,      []); }
function loadCollections() { return _store.collections ?? readFile(COLLECTIONS_FILE, []); }

// Save: update cache immediately, then await MongoDB persist
async function saveProducts(data)    { _store.products    = data; await dbSet("products",    data); safeWrite(PRODUCTS_FILE,    data); }
async function saveSettings(data)    { _store.settings    = data; await dbSet("settings",    data); safeWrite(SETTINGS_FILE,    data); }
async function saveOrders(data)      { _store.orders      = data; await dbSet("orders",      data); safeWrite(ORDERS_FILE,      data); }
async function saveCollections(data) { _store.collections = data; await dbSet("collections", data); safeWrite(COLLECTIONS_FILE, data); }

// DB STATUS — quick diagnostic endpoint
app.get("/admin/db-status", async (req, res) => {
  const db = await getDb();
  if (!db) return res.json({ connected: false });
  try {
    const doc = await db.collection("store").findOne({ _id: "products" });
    const dbProds = doc && Array.isArray(doc.data) ? doc.data : null;
    const saveTest = await dbSet("__savetest__", { ok: true });
    res.json({
      connected: true,
      saveWorks: saveTest,
      productsInDb: dbProds ? dbProds.length : null,
      productNamesInDb: dbProds ? dbProds.map(p => p.name) : null,
      storeProducts: _store.products ? _store.products.length : null,
    });
  } catch (e) {
    res.json({ connected: true, error: e.message });
  }
});

// DB WRITE TEST — writes a value to MongoDB and reads it back
app.get("/admin/db-test", async (req, res) => {
  const db = await getDb();
  if (!db) return res.json({ ok: false, step: "connect", error: "no db" });
  try {
    await db.collection("store").updateOne(
      { _id: "__test__" },
      { $set: { data: { ts: Date.now() } } },
      { upsert: true }
    );
  } catch (e) {
    return res.json({ ok: false, step: "write", error: e.message });
  }
  try {
    const doc = await db.collection("store").findOne({ _id: "__test__" });
    res.json({ ok: !!doc, step: "read", doc });
  } catch (e) {
    res.json({ ok: false, step: "read", error: e.message });
  }
});

// GAME CONFIG — public read, admin write
app.get("/api/game-config", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
  const gc = await dbGet("game_config", null);
  res.json(gc || { score1: 10000, code1: "JUMP5", label1: "5% Rabatt", discount1: 5, score2: 25000, code2: "JUMP10", label2: "10% Rabatt", discount2: 10 });
});

app.post("/admin/game-settings", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const { score1, code1, label1, discount1, score2, code2, label2, discount2 } = req.body || {};
  const data = {
    score1:    Math.max(0, parseInt(score1) || 10000),
    code1:     String(code1  || "JUMP5" ).toUpperCase().trim().slice(0, 20),
    label1:    String(label1 || "5% Rabatt").trim().slice(0, 50),
    discount1: Math.min(100, Math.max(0, parseFloat(discount1) || 5)),
    score2:    Math.max(0, parseInt(score2) || 25000),
    code2:     String(code2  || "JUMP10").toUpperCase().trim().slice(0, 20),
    label2:    String(label2 || "10% Rabatt").trim().slice(0, 50),
    discount2: Math.min(100, Math.max(0, parseFloat(discount2) || 10)),
  };
  await dbSet("game_config", data);
  res.json({ ok: true, ...data });
});

app.post("/api/validate-coupon", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
  const code = String(req.body?.code || "").toUpperCase().trim();
  if (!code) return res.json({ valid: false });
  const gc = await dbGet("game_config", null) || { code1: "JUMP5", discount1: 5, label1: "5% Rabatt", code2: "JUMP10", discount2: 10, label2: "10% Rabatt" };
  if (code === gc.code1) return res.json({ valid: true, code, label: gc.label1, discount: gc.discount1 });
  if (code === gc.code2) return res.json({ valid: true, code, label: gc.label2, discount: gc.discount2 });
  res.json({ valid: false });
});

app.get("/admin/coupon-stats", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
  try {
    const fresh = await dbGet("orders", null);
    if (fresh) _store.orders = fresh;
  } catch (_) {}
  const orders = loadOrders();
  const stats = {};
  const recent = [];
  for (const o of orders) {
    if (!o.couponCode) continue;
    const code = o.couponCode;
    if (!stats[code]) stats[code] = { code, label: o.couponLabel || code, count: 0, totalDiscount: 0 };
    stats[code].count++;
    stats[code].totalDiscount += o.discount || 0;
    recent.push({ code, label: o.couponLabel || code, discount: o.discount || 0, orderId: o.id, name: o.name || '–', createdAt: o.createdAt });
  }
  res.json({ stats: Object.values(stats), recent: recent.slice(0, 20) });
});

// LOGIN — passwords now configurable via admin
app.post("/login", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
  const { password } = req.body;
  const settings     = loadSettings();
  const pw           = settings.passwords || {};
  const customerPass = pw.customer || CUSTOMER_PASS;
  const adminPass    = pw.admin    || ADMIN_PASS;

  if (password === adminPass) return res.json({ role: "admin" });
  if (pw.customerEnabled !== false && password === customerPass) return res.json({ role: "customer" });

  res.status(401).json({ error: "wrong password" });
});

// PASSWORDS
app.post("/admin/passwords", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { const fresh = await dbGetCached("settings"); if (fresh) _store.settings = fresh; } catch (_) {}
  const settings = loadSettings();
  settings.passwords = settings.passwords || {};
  if (req.body.customer !== undefined && req.body.customer !== "")
    settings.passwords.customer = req.body.customer;
  if (req.body.admin !== undefined && req.body.admin !== "")
    settings.passwords.admin = req.body.admin;
  if (req.body.customerEnabled !== undefined)
    settings.passwords.customerEnabled = Boolean(req.body.customerEnabled);
  await saveSettings(settings);
  res.json({ success: true });
});

// PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const data = await dbGetCached("products");
    if (data) { _store.products = data; return res.json(data); }
  } catch (_) {}
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
  res.json(loadProducts());
});

// ADD PRODUCT (multiple images)
app.post("/admin/add-product", (req, res, next) => {
  upload.array("images", 10)(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Bild zu groß (max 4 MB). Bitte komprimiert hochladen." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({ error: "Name und Preis sind pflicht." });
  }
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const products = loadProducts();
  const images = req.files && req.files.length ? await Promise.all(req.files.map(f => uploadFile(f))) : [];
  const parseArr = (v) => {
    if (!v) return [];
    return typeof v === "string" ? JSON.parse(v) : v;
  };
  const stockRaw = req.body.stock !== undefined && req.body.stock !== "" ? parseInt(req.body.stock) : null;
  const newProduct = {
    id:            Date.now(),
    name:          req.body.name,
    price:         parseFloat(req.body.price),
    discountPrice: req.body.discountPrice ? parseFloat(req.body.discountPrice) : null,
    description:   req.body.description || "",
    category:      req.body.category || "",
    sizes:         parseArr(req.body.sizes),
    colors:        parseArr(req.body.colors),
    badge:         req.body.badge || "",
    visible:       req.body.visible !== "false",
    stock:         isNaN(stockRaw) ? null : stockRaw,
    soldOut:       false,
    mainCategory:  req.body.mainCategory || "all",
    images,
    image:         images[0] || null,
  };
  products.push(newProduct);
  await saveProducts(products);
  res.json({ success: true, product: newProduct });
});

// EDIT PRODUCT (multiple images)
app.put("/admin/product/:id", (req, res, next) => {
  upload.array("images", 10)(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Bild zu groß (max 4 MB). Bitte komprimiert hochladen." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Produkt nicht gefunden." });
  const existing = products[idx];
  const keepImages = req.body.keepImages ? JSON.parse(req.body.keepImages) : (existing.images || (existing.image ? [existing.image] : []));
  const newImages  = req.files && req.files.length ? await Promise.all(req.files.map(f => uploadFile(f))) : [];
  const allImages  = [...keepImages, ...newImages];
  const parseArr   = (v) => { if (!v) return undefined; return typeof v === "string" ? JSON.parse(v) : v; };
  const editStockRaw = req.body.stock !== undefined && req.body.stock !== "" ? parseInt(req.body.stock) : null;
  const editStock    = req.body.stock !== undefined ? (isNaN(editStockRaw) ? null : editStockRaw) : (existing.stock ?? null);
  products[idx] = {
    ...existing,
    name:          req.body.name          !== undefined ? req.body.name          : existing.name,
    price:         req.body.price         !== undefined ? parseFloat(req.body.price) : existing.price,
    discountPrice: req.body.discountPrice !== undefined ? (req.body.discountPrice ? parseFloat(req.body.discountPrice) : null) : existing.discountPrice,
    description:   req.body.description   !== undefined ? req.body.description   : existing.description,
    category:      req.body.category      !== undefined ? req.body.category      : existing.category,
    sizes:         parseArr(req.body.sizes)   ?? existing.sizes  ?? [],
    colors:        parseArr(req.body.colors)  ?? existing.colors ?? [],
    badge:         req.body.badge         !== undefined ? req.body.badge          : existing.badge,
    visible:       req.body.visible       !== undefined ? req.body.visible !== "false" : existing.visible,
    stock:         editStock,
    soldOut:       editStock !== null && editStock <= 0,
    mainCategory:  req.body.mainCategory !== undefined ? req.body.mainCategory : (existing.mainCategory || "all"),
    images:        allImages,
    image:         allImages[0] || existing.image,
  };
  await saveProducts(products);
  res.json({ success: true, product: products[idx] });
});

// DELETE PRODUCT
app.delete("/admin/product/:id", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const filtered = products.filter((p) => p.id !== id);

  if (filtered.length === products.length) {
    return res.status(404).json({ error: "Produkt nicht gefunden." });
  }

  await saveProducts(filtered);
  res.json({ success: true });
});

// TOGGLE VISIBILITY
app.patch("/admin/toggle/:id", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) return res.status(404).json({ error: "Produkt nicht gefunden." });

  product.visible = !product.visible;
  await saveProducts(products);
  res.json({ success: true, visible: product.visible });
});

// ORDERS
app.post("/orders", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  const orders = loadOrders();
  const order  = { id: "ORD-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  orders.unshift(order);
  _store.orders = orders;
  safeWrite(ORDERS_FILE, orders);
  await dbSet("orders", orders);

  // Decrement stock for each ordered item
  const products = loadProducts();
  let stockChanged = false;
  for (const item of (order.items || [])) {
    const prodId = parseInt(item.id); // strip size suffix (e.g. "1234567S" → 1234567)
    const prod   = products.find(p => p.id === prodId);
    if (prod && prod.stock !== null && prod.stock !== undefined) {
      prod.stock = Math.max(0, prod.stock - (item.qty || 1));
      if (prod.stock === 0) prod.soldOut = true;
      stockChanged = true;
    }
  }
  if (stockChanged) await saveProducts(products);

  sendOrderEmail({ ...order, _host: req.headers.host }).catch(err => console.error("[email] send failed:", err.message));
  res.json({ success: true, orderId: order.id });
});

app.get("/admin/orders", async (req, res) => {
  // Always read fresh from MongoDB so orders from any Vercel instance are visible
  try {
    const fresh = await dbGet("orders", null);
    if (fresh) { _store.orders = fresh; return res.json(fresh); }
  } catch (_) {}
  res.json(loadOrders());
});

// MEDIA LIBRARY
// Dedicated media upload endpoint (used by admin media library)
app.post("/admin/media/upload", (req, res, next) => {
  upload.array("files", 20)(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Datei zu groß (max 4 MB). Bitte ein kleineres Bild wählen." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: "No files" });
  try {
    const urls = await Promise.all(req.files.map(f => uploadFile(f)));
    res.json({ success: true, urls });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Media library — returns both local files and MongoDB-stored images
app.get("/admin/media", async (req, res) => {
  const items = [];
  // Local files (dev environment)
  if (fs.existsSync(UPLOADS_DIR)) {
    fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith(".")).forEach(f => {
      try {
        const stat = fs.statSync(path.join(UPLOADS_DIR, f));
        items.push({ id: f, name: f, url: "/uploads/" + f, size: stat.size, mtime: stat.mtime });
      } catch (_) {}
    });
  }
  // MongoDB images stored via dbSet in 'store' collection (key = "img_xxx")
  try {
    const db = await getDb();
    if (db) {
      const imgDocs = await db.collection("store")
        .find({ _id: /^img_/ }, { projection: { data: 0 } })
        .toArray();
      imgDocs.forEach(doc => {
        const id = doc._id.replace(/^img_/, "");
        const d = doc.data || {};
        items.push({ id, name: id, url: "/img/" + id, size: d.size || 0, mtime: d.at || "" });
      });
    }
  } catch (e) { console.error("[media] list failed:", e.message); }
  items.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  res.json(items);
});

// Delete media — handles both local files and MongoDB images
app.delete("/admin/media/:id", async (req, res) => {
  const id = req.params.id;
  // Try local file first
  const filepath = path.join(UPLOADS_DIR, path.basename(id));
  if (fs.existsSync(filepath)) { fs.unlinkSync(filepath); return res.json({ success: true }); }
  // Try MongoDB image (stored in store collection as "img_<id>")
  try {
    const db = await getDb();
    if (db) {
      const r = await db.collection("store").deleteOne({ _id: "img_" + id });
      if (r.deletedCount > 0) return res.json({ success: true });
    }
  } catch (e) { console.error("[media] delete failed:", e.message); }
  res.status(404).json({ error: "Not found" });
});

// Theme CSS — served before JS loads to prevent flash of default design
app.get("/theme.css", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 1500))]); } catch (_) {}
  const s = loadSettings();
  const t = s.theme || {};
  const bg = s.background && t.bgImageEnabled !== false
    ? `url(${s.background})` : 'none';
  const mobileBg = s.mobileBackground
    ? `url(${s.mobileBackground})` : bg;
  const css = `:root {
  --color-bg:          ${t.bgColor      || '#0f0f0f'};
  --color-bg-secondary:${t.bgSecondary  || '#111111'};
  --color-card:        ${t.cardColor    || '#1a1a1a'};
  --color-text:        ${t.textColor    || '#ffffff'};
  --color-heading:     ${t.headingColor || '#ffffff'};
  --color-accent:      ${t.accentColor  || '#ff2d55'};
  --color-button:      ${t.buttonColor  || '#ff2d55'};
  --color-border:      ${t.borderColor  || '#2a2a2a'};
  --color-border-soft: ${t.borderColor  || '#333333'};
}
body {
  background-image:    ${bg};
  background-size:     ${t.bgSize     || 'cover'};
  background-position: ${t.bgPosition || 'center'};
}
@media (max-width: 768px) {
  body { background-image: ${mobileBg}; background-attachment: scroll; }
}`;
  res.setHeader('Content-Type', 'text/css');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.send(css);
});

// Serve uploaded files from UPLOADS_DIR (fallback when express.static can't find them)
app.get("/uploads/:filename", async (req, res) => {
  const name = path.basename(req.params.filename);
  const filepath = path.join(UPLOADS_DIR, name);
  // Serve from disk if available on this instance
  if (fs.existsSync(filepath)) return res.sendFile(filepath);
  // Fall back to MongoDB — image might have been uploaded on a different Vercel instance
  try {
    const img = await dbGet("img_" + name, null);
    if (img) {
      res.setHeader("Content-Type", img.mime || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(Buffer.from(img.data, "base64"));
    }
  } catch (_) {}
  res.status(404).send("Not found");
});


// Serve images stored in MongoDB (Vercel-safe persistent image storage)
app.get("/img/:id", async (req, res) => {
  try {
    const img = await dbGet("img_" + req.params.id, null);
    if (!img) return res.status(404).send("Not found");
    res.setHeader("Content-Type", img.mime || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(img.data, "base64"));
  } catch (e) {
    res.status(500).send("Error");
  }
});

// SETTINGS GET
app.get("/settings", async (req, res) => {
  try {
    const data = await dbGetCached("settings");
    if (data) { _store.settings = data; return res.json(mergeSettings(data)); }
  } catch (_) {}
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
  res.json(loadSettings());
});

// SETTINGS UPDATE (Logo + Background Upload + text fields)
const settingsUploadFields = [
  { name: "logo" }, { name: "background" }, { name: "mobileBackground" },
  { name: "loginBackground" }, { name: "bannerImage" }, { name: "loginVideo" },
  { name: "loginLogo" }, { name: "cursorImage" },
  { name: "catBanner1" }, { name: "catBanner2" },
  { name: "emailLogo" },
];
app.post("/admin/settings", (req, res, next) => {
  upload.fields(settingsUploadFields)(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Datei zu groß (max 4 MB). Bitte ein kleineres Bild verwenden." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { const fresh = await dbGetCached("settings"); if (fresh) _store.settings = fresh; } catch (_) {}
  const settings = loadSettings();

  if (req.files && req.files.logo) {
    settings.logo = await uploadFile(req.files.logo[0]);
  }
  if (req.files && req.files.background) {
    settings.background = await uploadFile(req.files.background[0]);
  }
  if (req.files && req.files.mobileBackground) {
    settings.mobileBackground = await uploadFile(req.files.mobileBackground[0]);
  }
  if (req.body.clearMobileBackground === "1") {
    settings.mobileBackground = "";
  }
  if (req.files && req.files.loginBackground) {
    settings.loginBackground = await uploadFile(req.files.loginBackground[0]);
  }

  const str = (key) => { if (req.body[key] !== undefined) settings[key] = req.body[key]; };
  str("shopTitle"); str("loginText"); str("layout"); str("fontMain"); str("fontDisplay");

  if (req.files && req.files.bannerImage) {
    settings.heroBanner = settings.heroBanner || {};
    settings.heroBanner.image = await uploadFile(req.files.bannerImage[0]);
  }
  if (req.body.heroBanner) {
    const h = typeof req.body.heroBanner === "string"
      ? JSON.parse(req.body.heroBanner) : req.body.heroBanner;
    settings.heroBanner = { ...defaultSettings.heroBanner, ...settings.heroBanner, ...h };
  }
  if (req.body.theme) {
    const t = typeof req.body.theme === "string"
      ? JSON.parse(req.body.theme) : req.body.theme;
    settings.theme = { ...defaultSettings.theme, ...settings.theme, ...t };
  }
  if (req.body.buttonStyle) {
    const b = typeof req.body.buttonStyle === "string"
      ? JSON.parse(req.body.buttonStyle) : req.body.buttonStyle;
    settings.buttonStyle = { ...defaultSettings.buttonStyle, ...settings.buttonStyle, ...b };
  }
  if (req.body.effects) {
    const e = typeof req.body.effects === "string"
      ? JSON.parse(req.body.effects) : req.body.effects;
    settings.effects = { ...defaultSettings.effects, ...settings.effects, ...e };
  }

  if (req.files && req.files.loginVideo) {
    settings.loginPage = settings.loginPage || {};
    settings.loginPage.bgVideo = await uploadFile(req.files.loginVideo[0]);
  }
  if (req.files && req.files.loginLogo) {
    settings.loginPage = settings.loginPage || {};
    settings.loginPage.logoUrl = await uploadFile(req.files.loginLogo[0]);
  }
  if (req.body.loginPage) {
    const lp = typeof req.body.loginPage === "string"
      ? JSON.parse(req.body.loginPage) : req.body.loginPage;
    settings.loginPage = { ...defaultSettings.loginPage, ...(settings.loginPage || {}), ...lp };
  }
  if (req.body.visualEffects) {
    const ve = typeof req.body.visualEffects === "string"
      ? JSON.parse(req.body.visualEffects) : req.body.visualEffects;
    settings.visualEffects = settings.visualEffects || {};
    Object.keys(ve).forEach(key => {
      settings.visualEffects[key] = {
        ...(defaultSettings.visualEffects[key] || {}),
        ...(settings.visualEffects[key]        || {}),
        ...ve[key],
      };
    });
  }

  if (req.files?.cursorImage) {
    settings.cursor = settings.cursor || {};
    settings.cursor.imageUrl = await uploadFile(req.files.cursorImage[0]);
  }
  if (req.body.cursor) {
    const c = typeof req.body.cursor === "string" ? JSON.parse(req.body.cursor) : req.body.cursor;
    settings.cursor = { ...defaultSettings.cursor, ...(settings.cursor || {}), ...c };
  }

  if (req.body.payment) {
    const pm = typeof req.body.payment === "string" ? JSON.parse(req.body.payment) : req.body.payment;
    // Never overwrite secrets with empty strings
    const merged = { ...defaultSettings.payment, ...(settings.payment || {}) };
    Object.entries(pm).forEach(([k, v]) => { if (v !== "") merged[k] = v; });
    settings.payment = merged;
  }

  if (req.body.email) {
    const em = typeof req.body.email === "string" ? JSON.parse(req.body.email) : req.body.email;
    const merged = { ...defaultSettings.email, ...(settings.email || {}) };
    Object.entries(em).forEach(([k, v]) => { if (v !== "") merged[k] = v; });
    settings.email = merged;
  }
  if (req.files?.emailLogo) {
    settings.email = settings.email || {};
    settings.email.emailLogo = await uploadFile(req.files.emailLogo[0]);
  }
  if (req.body.clearEmailLogo === "1") {
    settings.email = settings.email || {};
    settings.email.emailLogo = "";
  }

  if (req.body.cloudinary) {
    const cl = typeof req.body.cloudinary === "string" ? JSON.parse(req.body.cloudinary) : req.body.cloudinary;
    const merged = { ...defaultSettings.cloudinary, ...(settings.cloudinary || {}) };
    Object.entries(cl).forEach(([k, v]) => { if (v !== "") merged[k] = v; });
    settings.cloudinary = merged;
  }

  if (req.body.categoryBanners) {
    const cb  = typeof req.body.categoryBanners === "string" ? JSON.parse(req.body.categoryBanners) : req.body.categoryBanners;
    const dCB = defaultSettings.categoryBanners;
    const sCB = settings.categoryBanners || {};
    settings.categoryBanners = {
      enabled:   cb.enabled   !== undefined ? cb.enabled   : (sCB.enabled   !== undefined ? sCB.enabled   : dCB.enabled),
      pageFont:  cb.pageFont  !== undefined ? cb.pageFont  : (sCB.pageFont  || dCB.pageFont),
      layout:    cb.layout    !== undefined ? cb.layout    : (sCB.layout    || dCB.layout),
      hoverZoom: cb.hoverZoom !== undefined ? cb.hoverZoom : (sCB.hoverZoom !== undefined ? sCB.hoverZoom : dCB.hoverZoom),
      banner1:   { ...dCB.banner1, ...(sCB.banner1 || {}), ...(cb.banner1 || {}) },
      banner2:   { ...dCB.banner2, ...(sCB.banner2 || {}), ...(cb.banner2 || {}) },
    };
  }
  if (req.files?.catBanner1) {
    settings.categoryBanners = settings.categoryBanners || { ...defaultSettings.categoryBanners };
    settings.categoryBanners.banner1 = settings.categoryBanners.banner1 || {};
    settings.categoryBanners.banner1.image = await uploadFile(req.files.catBanner1[0]);
  }
  if (req.files?.catBanner2) {
    settings.categoryBanners = settings.categoryBanners || { ...defaultSettings.categoryBanners };
    settings.categoryBanners.banner2 = settings.categoryBanners.banner2 || {};
    settings.categoryBanners.banner2.image = await uploadFile(req.files.catBanner2[0]);
  }

  await saveSettings(settings);
  res.json({ success: true, settings });
});

/* ═══════════════ COLLECTIONS ═══════════════════════════════ */
function slugify(name) {
  return (name || "").toLowerCase()
    .replace(/[äöü]/g, c => ({ ä:"ae", ö:"oe", ü:"ue" })[c] || c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "collection";
}

// Public: list visible collections
app.get("/collections", async (req, res) => {
  try {
    const data = await dbGetCached("collections");
    if (data) { _store.collections = data; return res.json(data.filter(c => c.visible !== false)); }
  } catch (_) {}
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
  res.json(loadCollections().filter(c => c.visible !== false));
});

// Public: single collection by slug (includes product data)
app.get("/collection/:slug", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
  const col = loadCollections().find(c => c.slug === req.params.slug);
  if (!col || col.visible === false) return res.status(404).json({ error: "Not found" });
  const prods = loadProducts();
  const productData = (col.products || []).map(id => prods.find(p => p.id === id)).filter(Boolean);
  res.json({ ...col, productData });
});

// Admin: all collections
app.get("/admin/collections", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 3000))]); } catch (_) {}
  res.json(loadCollections());
});

// Admin: add collection
app.post("/admin/collections", (req, res, next) => {
  upload.fields([{ name: "titleImage" }, { name: "bannerImage" }])(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Bild zu groß (max 4 MB)." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { const fresh = await dbGetCached("collections"); if (fresh) _store.collections = fresh; } catch (_) {}
  const cols = loadCollections();
  const name = req.body.name || "New Drop";
  const col  = {
    id:          Date.now(),
    name,
    slug:        slugify(name),
    description: req.body.description || "",
    titleImage:  req.files?.titleImage  ? await uploadFile(req.files.titleImage[0])  : "",
    banner:      req.files?.bannerImage ? await uploadFile(req.files.bannerImage[0]) : "",
    products:    req.body.products  ? JSON.parse(req.body.products)  : [],
    colors:      req.body.colors    ? JSON.parse(req.body.colors)    : { bg:"#0f0f0f", text:"#ffffff", accent:"#ff2d55", button:"#ff2d55" },
    fonts:       req.body.fonts     ? JSON.parse(req.body.fonts)     : { display:"Bangers", body:"Inter" },
    effects:     req.body.effects   ? JSON.parse(req.body.effects)   : {},
    intro:       req.body.intro     || "none",
    releaseDate: req.body.releaseDate || "",
    status:      req.body.status    || "coming_soon",
    visible:     req.body.visible   !== "false",
    createdAt:   new Date().toISOString(),
  };
  cols.unshift(col);
  await saveCollections(cols);
  res.json({ success: true, collection: col });
});

// Admin: edit collection
app.put("/admin/collection/:id", (req, res, next) => {
  upload.fields([{ name: "titleImage" }, { name: "bannerImage" }])(req, res, err => {
    if (err && err.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({ error: "Bild zu groß (max 4 MB)." });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { const fresh = await dbGetCached("collections"); if (fresh) _store.collections = fresh; } catch (_) {}
  const cols = loadCollections();
  const id   = parseInt(req.params.id);
  const idx  = cols.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const ex = cols[idx];
  const parseJ = (v, fb) => v ? JSON.parse(v) : fb;
  cols[idx] = {
    ...ex,
    name:        req.body.name        ?? ex.name,
    description: req.body.description ?? ex.description,
    products:    parseJ(req.body.products,  ex.products),
    colors:      parseJ(req.body.colors,    ex.colors),
    fonts:       parseJ(req.body.fonts,     ex.fonts),
    effects:     parseJ(req.body.effects,   ex.effects),
    intro:       req.body.intro       ?? ex.intro,
    releaseDate: req.body.releaseDate ?? ex.releaseDate,
    status:      req.body.status      ?? ex.status,
    visible:     req.body.visible !== undefined ? req.body.visible !== "false" : ex.visible,
    titleImage:  req.files?.titleImage  ? await uploadFile(req.files.titleImage[0])  : ex.titleImage,
    banner:      req.files?.bannerImage ? await uploadFile(req.files.bannerImage[0]) : ex.banner,
  };
  if (req.body.name) cols[idx].slug = slugify(req.body.name);
  await saveCollections(cols);
  res.json({ success: true, collection: cols[idx] });
});

// Admin: delete collection
app.delete("/admin/collection/:id", async (req, res) => {
  try { await Promise.race([_ready, new Promise(r => setTimeout(r, 5000))]); } catch (_) {}
  try { const fresh = await dbGetCached("collections"); if (fresh) _store.collections = fresh; } catch (_) {}
  const cols     = loadCollections();
  const id       = parseInt(req.params.id);
  const filtered = cols.filter(c => c.id !== id);
  if (filtered.length === cols.length) return res.status(404).json({ error: "Not found" });
  await saveCollections(filtered);
  res.json({ success: true });
});

/* ═══════════════ EMAIL ══════════════════════════════════════ */

function renderEmailTemplate(tmpl, vars) {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? vars[k] : "{{" + k + "}}");
}

function getEmailConfig() {
  const s   = loadSettings();
  const cfg = s.email || {};
  const host = process.env.SMTP_HOST || cfg.smtpHost || "";
  const port = parseInt(process.env.SMTP_PORT || cfg.smtpPort || 587);
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv !== undefined
    ? secureEnv === "true"
    : (cfg.smtpSecure !== undefined ? !!cfg.smtpSecure : port === 465);
  return {
    enabled:      process.env.SMTP_ENABLED === "true" || !!cfg.enabled,
    resendApiKey: process.env.RESEND_API_KEY || cfg.resendApiKey || "",
    emailLogo:    cfg.emailLogo    || "",
    accentColor:  cfg.accentColor  || "#ff2d55",
    smtpHost:     host,
    smtpPort:     port,
    smtpSecure:   secure,
    smtpUser:     process.env.SMTP_USER || cfg.smtpUser || "",
    smtpPass:     process.env.SMTP_PASS || cfg.smtpPass || "",
    senderName:   process.env.SMTP_SENDER_NAME  || cfg.senderName  || "DRIP VAULT",
    senderEmail:  process.env.SMTP_SENDER_EMAIL || cfg.senderEmail || "",
    subject:      cfg.subject || "Deine Bestellung {{orderId}}",
    body:         cfg.body    || "Hallo {{name}}, danke für deine Bestellung!",
  };
}

function buildEmailHtml(bodyText, vars, cfg) {
  const accent = cfg.accentColor || "#ff2d55";
  const rows   = (vars._itemsHtml || "").trim();
  const year   = new Date().getFullYear();

  // Resolve logo URL to absolute if it's a relative path
  const logoUrl = cfg.emailLogo
    ? (cfg.emailLogo.startsWith("http") ? cfg.emailLogo : `https://${vars._host || ""}${cfg.emailLogo}`)
    : "";

  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="${vars.shopTitle}" style="max-height:70px;max-width:220px;object-fit:contain;display:block;margin:0 auto 12px;">
       <p style="margin:0;font-size:13px;color:rgba(255,255,255,.65);letter-spacing:.12em;text-transform:uppercase;">Bestellbestätigung</p>`
    : `<h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:.1em;color:#fff;font-family:Arial,sans-serif;">${vars.shopTitle}</h1>
       <p style="margin:0;font-size:13px;color:rgba(255,255,255,.65);letter-spacing:.12em;text-transform:uppercase;">Bestellbestätigung</p>`;

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${vars.shopTitle} – Bestellung ${vars.orderId}</title></head>
<body style="margin:0;padding:0;background:#111;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.6);">

  <!-- Header band -->
  <tr><td style="background:${accent};padding:32px 40px;text-align:center;">
    ${headerContent}
  </td></tr>

  <!-- Greeting -->
  <tr><td style="background:#1c1c1e;padding:32px 40px 0;">
    <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#fff;">Hallo ${vars.name},</p>
    <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">vielen Dank für deine Bestellung – wir haben sie erhalten und kümmern uns darum!</p>
  </td></tr>

  <!-- Order summary box -->
  <tr><td style="background:#1c1c1e;padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;">
      <tr><td colspan="2" style="padding:14px 18px;border-bottom:1px solid #2a2a2a;">
        <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Bestellnummer</span><br>
        <span style="font-size:15px;font-weight:700;color:#fff;">${vars.orderId}</span>
      </td></tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;border-right:1px solid #2a2a2a;width:50%">
          <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Zahlungsart</span><br>
          <span style="font-size:14px;color:#ccc;">${vars.paymentMethod}</span>
        </td>
        <td style="padding:14px 18px;border-bottom:1px solid #2a2a2a;width:50%">
          <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Gesamtbetrag</span><br>
          <span style="font-size:16px;font-weight:900;color:${accent};">${vars.total}</span>
        </td>
      </tr>
      ${vars.address ? `<tr><td colspan="2" style="padding:14px 18px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Lieferadresse</span><br>
        <span style="font-size:14px;color:#ccc;">${vars.address}</span>
      </td></tr>` : ""}
    </table>
  </td></tr>

  <!-- Items -->
  <tr><td style="background:#1c1c1e;padding:0 40px 24px;">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Bestellte Artikel</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;">
      ${rows}
    </table>
  </td></tr>

  ${vars.note ? `<!-- Note -->
  <tr><td style="background:#1c1c1e;padding:0 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;">
      <tr><td style="padding:14px 18px;">
        <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#666;">Anmerkung</span><br>
        <span style="font-size:14px;color:#ccc;">${vars.note}</span>
      </td></tr>
    </table>
  </td></tr>` : ""}

  <!-- Closing -->
  <tr><td style="background:#1c1c1e;padding:0 40px 32px;">
    <p style="margin:0;font-size:13px;color:#777;line-height:1.8;">
      Wir melden uns, sobald deine Bestellung auf dem Weg zu dir ist.<br>
      Bei Fragen? Einfach auf diese E-Mail antworten.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#161618;padding:20px 40px;text-align:center;border-top:1px solid #2a2a2a;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${vars.shopTitle}" style="max-height:32px;object-fit:contain;display:block;margin:0 auto 8px;opacity:.5;">` : ""}
    <p style="margin:0;font-size:11px;color:#444;">© ${year} ${vars.shopTitle} · Alle Rechte vorbehalten</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

async function sendOrderEmail(order) {
  // Always refresh settings from MongoDB before sending
  try { const f = await dbGetCached("settings"); if (f) _store.settings = f; } catch (_) {}

  const s   = loadSettings();
  const cfg = getEmailConfig();
  if (!cfg.enabled || !order.email) return;

  const fmt = n => parseFloat(n || 0).toLocaleString("de-DE", { style: "currency", currency: s.payment?.currency || "EUR" });
  const payLabels = { paypal: "PayPal", manual: "Auf Rechnung / Manuell", card: "Kreditkarte" };
  const address   = [order.street, `${order.zip || ""} ${order.city || ""}`.trim(), order.country]
    .filter(Boolean).join(", ");

  const itemsHtml = (order.items || []).map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #333;color:#fff;font-size:14px;">${i.name} × ${i.qty}</td>
     <td align="right" style="padding:8px 0;border-bottom:1px solid #333;color:#ccc;font-size:14px;">${fmt(i.price * i.qty)}</td></tr>`
  ).join("");
  const itemsText = (order.items || []).map(i => `  • ${i.name} × ${i.qty}  — ${fmt(i.price * i.qty)}`).join("\n");

  const vars = {
    name:          order.name          || "",
    email:         order.email         || "",
    orderId:       order.id            || "",
    total:         fmt(order.total),
    paymentMethod: payLabels[order.paymentMethod] || order.paymentMethod || "—",
    items:         itemsText,
    address,
    note:          order.note          || "",
    shopTitle:     s.shopTitle         || "DRIP VAULT",
    _itemsHtml:    itemsHtml,
    _host:         order._host         || "",
  };

  const subject = renderEmailTemplate(cfg.subject || "Deine Bestellung {{orderId}} ist eingegangen", vars);
  const textBody = renderEmailTemplate(cfg.body   || "Hallo {{name}}, danke für deine Bestellung!", vars);
  const htmlBody = buildEmailHtml(textBody, vars, cfg);
  const from     = `${cfg.senderName || "DRIP VAULT"} <${cfg.senderEmail || cfg.smtpUser || "noreply@example.com"}>`;

  // ── 1. Resend API (recommended — works on all Vercel plans) ────────────────
  if (cfg.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { "Authorization": `Bearer ${cfg.resendApiKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from, to: [order.email], subject, html: htmlBody, text: textBody }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Resend API: ${err.message || res.status}`);
    }
    return;
  }

  // ── 2. SMTP fallback (may be blocked on Vercel Hobby) ─────────────────────
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
    console.warn("[email] No Resend key and no SMTP credentials — skipping");
    return;
  }
  const transporter = nodemailer.createTransport({
    host:       cfg.smtpHost,
    port:       cfg.smtpPort,
    secure:     cfg.smtpSecure,
    requireTLS: cfg.smtpPort === 587,
    auth:       { user: cfg.smtpUser, pass: cfg.smtpPass },
    tls:        { rejectUnauthorized: false },
  });
  await transporter.sendMail({ from, to: order.email, subject, text: textBody, html: htmlBody });
}

// Test-email endpoint — sends a preview to the configured address
app.post("/admin/test-email", async (req, res) => {
  // Refresh settings so we always use the latest credentials
  try { const f = await dbGetCached("settings"); if (f) _store.settings = f; } catch (_) {}
  const cfg = getEmailConfig();
  if (!cfg.enabled) return res.status(400).json({ error: "E-Mail-Benachrichtigungen sind deaktiviert." });
  if (!cfg.resendApiKey && (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass)) {
    return res.status(400).json({ error: "Weder Resend API-Key noch SMTP-Zugangsdaten konfiguriert." });
  }
  const to = (req.body.to || "").trim();
  if (!to) return res.status(400).json({ error: "Bitte eine Ziel-E-Mail-Adresse angeben." });
  try {
    const fakeOrder = {
      id:            "ORD-TEST",
      name:          "Max Mustermann",
      email:         to,
      street:        "Musterstraße 1",
      zip:           "10115",
      city:          "Berlin",
      country:       "DE",
      total:         89.99,
      paymentMethod: "manual",
      note:          "Bitte schnell liefern!",
      items:         [{ name: "Drip Tee", price: 59.99, qty: 1 }, { name: "Cap", price: 29.99, qty: 1 }],
      _host:         req.headers.host,
    };
    await sendOrderEmail(fakeOrder);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════ PAYMENT ═══════════════════════════════════ */

// Public payment config — no secrets exposed
app.get("/payment-config", async (req, res) => {
  const s = loadSettings();
  const p = s.payment || {};
  res.json({
    paypalEnabled:      !!(p.paypalEnabled && p.paypalClientId),
    paypalClientId:     p.paypalClientId || "",
    paypalMode:         p.paypalMode     || "sandbox",
    manualEnabled:      p.manualEnabled  !== false,
    manualInstructions: p.manualInstructions || "",
    currency:           p.currency       || "EUR",
    shippingFree:       p.shippingFree   !== false,
    shippingCost:       p.shippingCost   || 4.99,
    freeShippingAbove:  p.freeShippingAbove || 0,
  });
});

async function getPaypalToken(clientId, secret, mode) {
  const base = mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  const res = await fetch(base + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(clientId + ":" + secret).toString("base64"),
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return { token: data.access_token, base };
}

// Create PayPal order (server-side amount verification)
app.post("/checkout/create-paypal-order", async (req, res) => {
  const s = loadSettings();
  const p = s.payment || {};
  if (!p.paypalEnabled || !p.paypalClientId || !p.paypalClientSecret) {
    return res.status(400).json({ error: "PayPal not configured" });
  }
  const products = loadProducts();
  let total = 0;
  for (const item of (req.body.items || [])) {
    const prod = products.find(pr => String(pr.id) === String(item.id));
    if (!prod) continue;
    const price = prod.discountPrice && prod.discountPrice < prod.price
      ? prod.discountPrice : prod.price;
    total += price * item.qty;
  }
  const shipping = p.shippingFree ? 0 : (p.shippingCost || 0);
  total += shipping;
  // Use client-side discounted total if provided (coupon applied)
  if (req.body.discountedTotal && req.body.discountedTotal > 0 && req.body.discountedTotal < total) {
    total = Math.round(req.body.discountedTotal * 100) / 100;
  }
  const currency = p.currency || "EUR";

  try {
    const { token, base } = await getPaypalToken(p.paypalClientId, p.paypalClientSecret, p.paypalMode);
    const createRes = await fetch(base + "/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: currency, value: total.toFixed(2) } }],
      }),
    });
    const order = await createRes.json();
    res.json({ id: order.id });
  } catch (err) {
    res.status(500).json({ error: "PayPal error", details: err.message });
  }
});

// Capture PayPal order + save to orders.json
app.post("/checkout/capture-paypal-order", async (req, res) => {
  const { paypalOrderId, customerInfo, items } = req.body;
  const s = loadSettings();
  const p = s.payment || {};
  try {
    const { token, base } = await getPaypalToken(p.paypalClientId, p.paypalClientSecret, p.paypalMode);
    const captureRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const captured = await captureRes.json();
    if (captured.status !== "COMPLETED") {
      return res.status(400).json({ error: "Payment not completed", paypal: captured });
    }
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    const orders  = loadOrders();
    const order   = {
      id:              "ORD-" + Date.now(),
      ...(customerInfo || {}),
      items:           items || [],
      total:           parseFloat(capture?.amount?.value || 0),
      currency:        p.currency || "EUR",
      paymentMethod:   "paypal",
      paypalOrderId,
      paypalCaptureId: capture?.id,
      status:          "processing",
      createdAt:       new Date().toISOString(),
    };
    orders.unshift(order);
    safeWrite(ORDERS_FILE, orders);
    sendOrderEmail({ ...order, _host: req.headers.host }).catch(err => console.error("[email] send failed:", err.message));
    res.json({ success: true, orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: "Capture failed", details: err.message });
  }
});

// Update order (status, shipping info, notes)
app.put("/admin/order/:id", async (req, res) => {
  const orders = loadOrders();
  const idx    = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  orders[idx] = {
    ...orders[idx],
    ...req.body,
    id:        orders[idx].id,
    createdAt: orders[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  safeWrite(ORDERS_FILE, orders);
  res.json({ success: true, order: orders[idx] });
});

// Delete order
app.delete("/admin/order/:id", async (req, res) => {
  const orders   = loadOrders();
  const filtered = orders.filter(o => o.id !== req.params.id);
  if (filtered.length === orders.length) return res.status(404).json({ error: "Not found" });
  await saveOrders(filtered);
  res.json({ success: true });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  _ready.finally(() => app.listen(port, () => console.log(`Shop läuft auf http://localhost:${port}`)));
}
module.exports = app;
