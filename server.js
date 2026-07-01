const express    = require("express");
const fs         = require("fs");
const multer     = require("multer");
const path       = require("path");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ dest: "public/uploads/" });

const CUSTOMER_PASS = "yes";
const ADMIN_PASS = "yes0511";

// Dateien
const PRODUCTS_FILE = "./data.json";
const SETTINGS_FILE = "./settings.json";

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
    smtpHost:     "",
    smtpPort:     587,
    smtpSecure:   false,
    smtpUser:     "",
    smtpPass:     "",
    senderName:   "DRIP VAULT",
    senderEmail:  "",
    subject:      "Deine Bestellung {{orderId}} ist eingegangen 🛍",
    body:         "Hallo {{name}},\n\nvielen Dank für deine Bestellung bei DRIP VAULT!\n\nDeine Bestellnummer: {{orderId}}\nGesamtbetrag: {{total}}\nZahlungsart: {{paymentMethod}}\n\n📦 Bestellte Artikel:\n{{items}}\n\nLieferadresse:\n{{address}}\n\nWir melden uns, sobald deine Bestellung versendet wurde.\n\nBis bald,\nDas DRIP VAULT Team",
  },
};

// Load helpers
function loadProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
}

function saveProducts(data) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
}

function loadSettings() {
  const saved = fs.existsSync(SETTINGS_FILE)
    ? JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"))
    : {};
  const dVE = defaultSettings.visualEffects;
  const sVE = saved.visualEffects || {};
  return {
    ...defaultSettings,
    ...saved,
    theme:       { ...defaultSettings.theme,       ...(saved.theme       || {}) },
    heroBanner:  { ...defaultSettings.heroBanner,  ...(saved.heroBanner  || {}) },
    buttonStyle: { ...defaultSettings.buttonStyle, ...(saved.buttonStyle || {}) },
    effects:     { ...defaultSettings.effects,     ...(saved.effects     || {}) },
    loginPage: (() => {
      const dLP = defaultSettings.loginPage;
      const sLP = saved.loginPage || {};
      return {
        ...dLP, ...sLP,
        money: { ...dLP.money, ...(sLP.money || {}) },
        grain: { ...dLP.grain, ...(sLP.grain || {}) },
      };
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
    cursor:   { ...defaultSettings.cursor,   ...(saved.cursor   || {}) },
    payment:  { ...defaultSettings.payment,  ...(saved.payment  || {}) },
    email:    { ...defaultSettings.email,    ...(saved.email    || {}) },
  };
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// LOGIN — passwords now configurable via admin
app.post("/login", (req, res) => {
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
app.post("/admin/passwords", (req, res) => {
  const settings = loadSettings();
  settings.passwords = settings.passwords || {};
  if (req.body.customer !== undefined && req.body.customer !== "")
    settings.passwords.customer = req.body.customer;
  if (req.body.admin !== undefined && req.body.admin !== "")
    settings.passwords.admin = req.body.admin;
  if (req.body.customerEnabled !== undefined)
    settings.passwords.customerEnabled = Boolean(req.body.customerEnabled);
  saveSettings(settings);
  res.json({ success: true });
});

// PRODUCTS
app.get("/products", (req, res) => {
  res.json(loadProducts());
});

// ADD PRODUCT (multiple images)
app.post("/admin/add-product", upload.array("images", 10), (req, res) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({ error: "Name und Preis sind pflicht." });
  }
  const products = loadProducts();
  const images = req.files ? req.files.map(f => "/uploads/" + f.filename) : [];
  const parseArr = (v) => {
    if (!v) return [];
    return typeof v === "string" ? JSON.parse(v) : v;
  };
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
    images,
    image:         images[0] || null,
  };
  products.push(newProduct);
  saveProducts(products);
  res.json({ success: true, product: newProduct });
});

// EDIT PRODUCT (multiple images)
app.put("/admin/product/:id", upload.array("images", 10), (req, res) => {
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Produkt nicht gefunden." });
  const existing = products[idx];
  const keepImages = req.body.keepImages ? JSON.parse(req.body.keepImages) : (existing.images || (existing.image ? [existing.image] : []));
  const newImages  = req.files ? req.files.map(f => "/uploads/" + f.filename) : [];
  const allImages  = [...keepImages, ...newImages];
  const parseArr   = (v) => { if (!v) return undefined; return typeof v === "string" ? JSON.parse(v) : v; };
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
    images:        allImages,
    image:         allImages[0] || existing.image,
  };
  saveProducts(products);
  res.json({ success: true, product: products[idx] });
});

// DELETE PRODUCT
app.delete("/admin/product/:id", (req, res) => {
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const filtered = products.filter((p) => p.id !== id);

  if (filtered.length === products.length) {
    return res.status(404).json({ error: "Produkt nicht gefunden." });
  }

  saveProducts(filtered);
  res.json({ success: true });
});

// TOGGLE VISIBILITY
app.patch("/admin/toggle/:id", (req, res) => {
  const products = loadProducts();
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);

  if (!product) return res.status(404).json({ error: "Produkt nicht gefunden." });

  product.visible = !product.visible;
  saveProducts(products);
  res.json({ success: true, visible: product.visible });
});

// ORDERS
const ORDERS_FILE = "./orders.json";

function loadOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

app.post("/orders", async (req, res) => {
  const orders = loadOrders();
  const order  = { id: "ORD-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  orders.unshift(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  sendOrderEmail(order).catch(err => console.error("[email] send failed:", err.message));
  res.json({ success: true, orderId: order.id });
});

app.get("/admin/orders", (req, res) => {
  res.json(loadOrders());
});

// MEDIA LIBRARY
app.get("/admin/media", (req, res) => {
  const uploadsDir = path.join(__dirname, "public/uploads");
  if (!fs.existsSync(uploadsDir)) return res.json([]);
  const files = fs.readdirSync(uploadsDir)
    .filter(f => !f.startsWith("."))
    .map(f => {
      const stat = fs.statSync(path.join(uploadsDir, f));
      return { name: f, url: "/uploads/" + f, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  res.json(files);
});

app.delete("/admin/media/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(__dirname, "public/uploads", filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Not found" });
  fs.unlinkSync(filepath);
  res.json({ success: true });
});

// SETTINGS GET
app.get("/settings", (req, res) => {
  res.json(loadSettings());
});

// SETTINGS UPDATE (Logo + Background Upload + text fields)
app.post("/admin/settings", upload.fields([
  { name: "logo" },
  { name: "background" },
  { name: "loginBackground" },
  { name: "bannerImage" },
  { name: "loginVideo" },
  { name: "loginLogo" },
  { name: "cursorImage" },
]), (req, res) => {
  const settings = loadSettings();

  if (req.files && req.files.logo) {
    settings.logo = "/uploads/" + req.files.logo[0].filename;
  }
  if (req.files && req.files.background) {
    settings.background = "/uploads/" + req.files.background[0].filename;
  }
  if (req.files && req.files.loginBackground) {
    settings.loginBackground = "/uploads/" + req.files.loginBackground[0].filename;
  }

  const str = (key) => { if (req.body[key] !== undefined) settings[key] = req.body[key]; };
  str("shopTitle"); str("loginText"); str("layout"); str("fontMain"); str("fontDisplay");

  if (req.files && req.files.bannerImage) {
    settings.heroBanner = settings.heroBanner || {};
    settings.heroBanner.image = "/uploads/" + req.files.bannerImage[0].filename;
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
    settings.loginPage.bgVideo = "/uploads/" + req.files.loginVideo[0].filename;
  }
  if (req.files && req.files.loginLogo) {
    settings.loginPage = settings.loginPage || {};
    settings.loginPage.logoUrl = "/uploads/" + req.files.loginLogo[0].filename;
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
    settings.cursor.imageUrl = "/uploads/" + req.files.cursorImage[0].filename;
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

  saveSettings(settings);
  res.json({ success: true, settings });
});

/* ═══════════════ COLLECTIONS ═══════════════════════════════ */
const COLLECTIONS_FILE = "./collections.json";

function loadCollections() {
  if (!fs.existsSync(COLLECTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, "utf-8"));
}
function saveCollections(data) {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(data, null, 2));
}
function slugify(name) {
  return (name || "").toLowerCase()
    .replace(/[äöü]/g, c => ({ ä:"ae", ö:"oe", ü:"ue" })[c] || c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "collection";
}

// Public: list visible collections
app.get("/collections", (req, res) => {
  res.json(loadCollections().filter(c => c.visible !== false));
});

// Public: single collection by slug (includes product data)
app.get("/collection/:slug", (req, res) => {
  const col = loadCollections().find(c => c.slug === req.params.slug);
  if (!col || col.visible === false) return res.status(404).json({ error: "Not found" });
  const prods = loadProducts();
  const productData = (col.products || []).map(id => prods.find(p => p.id === id)).filter(Boolean);
  res.json({ ...col, productData });
});

// Admin: all collections
app.get("/admin/collections", (req, res) => {
  res.json(loadCollections());
});

// Admin: add collection
app.post("/admin/collections", upload.fields([
  { name: "titleImage" },
  { name: "bannerImage" },
]), (req, res) => {
  const cols = loadCollections();
  const name = req.body.name || "New Drop";
  const col  = {
    id:          Date.now(),
    name,
    slug:        slugify(name),
    description: req.body.description || "",
    titleImage:  req.files?.titleImage  ? "/uploads/" + req.files.titleImage[0].filename  : "",
    banner:      req.files?.bannerImage ? "/uploads/" + req.files.bannerImage[0].filename : "",
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
  saveCollections(cols);
  res.json({ success: true, collection: col });
});

// Admin: edit collection
app.put("/admin/collection/:id", upload.fields([
  { name: "titleImage" },
  { name: "bannerImage" },
]), (req, res) => {
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
    titleImage:  req.files?.titleImage  ? "/uploads/" + req.files.titleImage[0].filename  : ex.titleImage,
    banner:      req.files?.bannerImage ? "/uploads/" + req.files.bannerImage[0].filename : ex.banner,
  };
  if (req.body.name) cols[idx].slug = slugify(req.body.name);
  saveCollections(cols);
  res.json({ success: true, collection: cols[idx] });
});

// Admin: delete collection
app.delete("/admin/collection/:id", (req, res) => {
  const cols     = loadCollections();
  const id       = parseInt(req.params.id);
  const filtered = cols.filter(c => c.id !== id);
  if (filtered.length === cols.length) return res.status(404).json({ error: "Not found" });
  saveCollections(filtered);
  res.json({ success: true });
});

/* ═══════════════ EMAIL ══════════════════════════════════════ */

function renderEmailTemplate(tmpl, vars) {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] !== undefined ? vars[k] : "{{" + k + "}}");
}

async function sendOrderEmail(order) {
  const s   = loadSettings();
  const cfg = s.email || {};
  if (!cfg.enabled || !cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass || !order.email) return;

  const fmt = n => parseFloat(n || 0).toLocaleString("de-DE", { style: "currency", currency: s.payment?.currency || "EUR" });
  const itemsList = (order.items || [])
    .map(i => `  • ${i.name} × ${i.qty}  — ${fmt(i.price * i.qty)}`)
    .join("\n");
  const payLabels = { paypal: "PayPal", manual: "Auf Rechnung / Manuell", card: "Kreditkarte" };
  const address   = [order.street, `${order.zip || ""} ${order.city || ""}`.trim(), order.country]
    .filter(Boolean).join(", ");

  const vars = {
    name:          order.name          || "",
    email:         order.email         || "",
    orderId:       order.id            || "",
    total:         fmt(order.total),
    paymentMethod: payLabels[order.paymentMethod] || order.paymentMethod || "—",
    items:         itemsList,
    address,
    note:          order.note          || "",
    shopTitle:     s.shopTitle         || "DRIP VAULT",
  };

  const subject = renderEmailTemplate(cfg.subject || "Deine Bestellung {{orderId}}", vars);
  const text    = renderEmailTemplate(cfg.body    || "Hallo {{name}}, danke für deine Bestellung!", vars);

  const transporter = nodemailer.createTransport({
    host:   cfg.smtpHost,
    port:   parseInt(cfg.smtpPort)  || 587,
    secure: !!cfg.smtpSecure,
    auth:   { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  await transporter.sendMail({
    from:    `"${cfg.senderName || "DRIP VAULT"}" <${cfg.senderEmail || cfg.smtpUser}>`,
    to:      order.email,
    subject,
    text,
    html:    text.replace(/\n/g, "<br>"),
  });
}

// Test-email endpoint — sends a preview to the configured address
app.post("/admin/test-email", async (req, res) => {
  const s   = loadSettings();
  const cfg = s.email || {};
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
    return res.status(400).json({ error: "SMTP nicht konfiguriert." });
  }
  const to = req.body.to || cfg.smtpUser;
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
      items:         [{ name: "Drip Tee", price: 59.99, qty: 1 }, { name: "Cap", price: 29.99, qty: 1 }],
    };
    await sendOrderEmail({ ...fakeOrder, email: to });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════ PAYMENT ═══════════════════════════════════ */

// Public payment config — no secrets exposed
app.get("/payment-config", (req, res) => {
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
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    sendOrderEmail(order).catch(err => console.error("[email] send failed:", err.message));
    res.json({ success: true, orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: "Capture failed", details: err.message });
  }
});

// Update order (status, shipping info, notes)
app.put("/admin/order/:id", (req, res) => {
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
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  res.json({ success: true, order: orders[idx] });
});

// Delete order
app.delete("/admin/order/:id", (req, res) => {
  const orders   = loadOrders();
  const filtered = orders.filter(o => o.id !== req.params.id);
  if (filtered.length === orders.length) return res.status(404).json({ error: "Not found" });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(filtered, null, 2));
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Shop läuft auf http://localhost:3000");
});
