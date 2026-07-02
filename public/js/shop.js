'use strict';
Auth.requireRole('customer');

// ── State ──────────────────────────────────────────────────────
let cart = [];
let pdProduct    = null;
let pdQty        = 1;
let pdSize       = null;
let pdColor      = null;
let pdCurrentIdx = 0;
let pdImgs       = [];
let _particleRAF = null;

// ── Helpers ────────────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function formatPrice(n) {
  return parseFloat(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
function getImages(p) {
  if (p.images && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

// ── Theme & Settings ───────────────────────────────────────────
function updateTheme(s) {
  const r = document.documentElement.style;
  const t = s.theme || {};
  r.setProperty('--color-bg',           t.bgColor      || '#0f0f0f');
  r.setProperty('--color-bg-secondary', t.bgSecondary  || '#111111');
  r.setProperty('--color-card',         t.cardColor    || '#1a1a1a');
  r.setProperty('--color-text',         t.textColor    || '#ffffff');
  r.setProperty('--color-heading',      t.headingColor || '#ffffff');
  r.setProperty('--color-accent',       t.accentColor  || '#ff2d55');
  r.setProperty('--color-button',       t.buttonColor  || '#ff2d55');
  r.setProperty('--color-border',       t.borderColor  || '#2a2a2a');
  r.setProperty('--color-border-soft',  t.borderColor  || '#333333');

  if (s.fontMain)    r.setProperty('--font-main',    `"${s.fontMain}", sans-serif`);
  if (s.fontDisplay) r.setProperty('--font-display', `"${s.fontDisplay}", cursive`);

  if (s.background && t.bgImageEnabled !== false) {
    document.body.style.backgroundImage    = `url(${s.background})`;
    document.body.style.backgroundSize     = t.bgSize     || 'cover';
    document.body.style.backgroundPosition = t.bgPosition || 'center';
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

function applyButtonStyle(bs) {
  if (!bs) return;
  const style = document.createElement('style');
  style.id = 'dv-btn-style';
  const old = document.getElementById('dv-btn-style');
  if (old) old.remove();
  const radius = (bs.borderRadius ?? 6) + 'px';
  const size   = (bs.fontSize    ?? 13) + 'px';
  const ls     = (bs.letterSpacing ?? 0.07) + 'em';
  const shadow = bs.shadow
    ? `0 4px 20px -4px ${bs.shadowColor || bs.bgColor || '#ff2d55'}`
    : 'none';
  const upper = bs.uppercase ? 'uppercase' : 'none';
  const anim  = bs.animation !== 'none' ? `anim-${bs.animation}` : '';
  const btnText = bs.text || 'In den Warenkorb';
  style.textContent = `
    .btn-add-cart {
      background: ${bs.bgColor || '#ff2d55'};
      color: ${bs.textColor || '#fff'};
      border-radius: ${radius};
      font-size: ${size};
      font-weight: ${bs.fontWeight || 700};
      letter-spacing: ${ls};
      text-transform: ${upper};
      box-shadow: ${shadow};
      --btn-shadow-color: ${bs.shadowColor || bs.bgColor || '#ff2d55'}40;
    }
    .pd-add-cart {
      background: ${bs.bgColor || '#ff2d55'};
      color: ${bs.textColor || '#fff'};
      border-radius: ${radius};
      font-size: ${(bs.fontSize ?? 13) + 2}px;
      font-weight: ${bs.fontWeight || 700};
      letter-spacing: ${ls};
      text-transform: ${upper};
      box-shadow: ${shadow};
    }
  `;
  document.head.appendChild(style);
  if (anim) {
    document.querySelectorAll('.btn-add-cart').forEach(b => b.classList.add(anim));
  }
  // Set button text
  document.querySelectorAll('.btn-add-cart').forEach(b => {
    if (b.textContent.trim() === '' || !b.dataset.textSet) {
      b.textContent = btnText;
      b.dataset.textSet = '1';
    }
  });
  document.getElementById('pdAddCart').textContent = btnText;
}

function applyEffects(fx) {
  if (!fx) return;
  const grain = document.getElementById('grainOverlay');
  if (grain) grain.classList.toggle('active', !!fx.grain);

  if (fx.particles) initParticles();
  else stopParticles();

  document.body.classList.toggle('fx-neon',   !!fx.neonGlow);
  document.body.classList.toggle('fx-cursor', !!fx.cursor);
  if (fx.cursor) initCursor();
}

async function applySettings() {
  const cached = localStorage.getItem('themeSettings');
  if (cached) updateTheme(JSON.parse(cached));

  const s = await fetch('/settings').then(r => r.json());
  localStorage.setItem('themeSettings', JSON.stringify(s));

  updateTheme(s);
  applyButtonStyle(s.buttonStyle);
  applyEffects(s.effects);
  if (typeof DVEffects  !== 'undefined') DVEffects.initVisualEffects(s);
  if (typeof DVCursor  !== 'undefined') DVCursor.init(s);

  if (s.shopTitle) document.title = s.shopTitle;

  if (s.logo) {
    const img = document.createElement('img');
    img.src = s.logo;
    img.style.cssText = 'height:38px;object-fit:contain;display:block;';
    const title = document.querySelector('.site-title');
    if (title) title.replaceWith(img);
  }

  if (s.layout) {
    const grid = document.getElementById('productGrid');
    if (grid) grid.className = s.layout === 'list' ? 'product-list' : 'product-grid';
  }

  const banner = document.getElementById('heroBanner');
  if (banner && s.heroBanner) {
    const h = s.heroBanner;
    banner.style.display = h.enabled ? '' : 'none';
    if (!h.enabled) return;
    document.getElementById('heroTitle').textContent    = h.title;
    document.getElementById('heroSubtitle').textContent = h.subtitle;
    document.getElementById('heroBtn').textContent      = h.buttonText;
    document.getElementById('heroBtn').onclick = () =>
      document.getElementById('productGrid').scrollIntoView({ behavior: 'smooth' });
    if (h.image) {
      banner.style.backgroundImage    = `url(${h.image})`;
      banner.style.backgroundSize     = 'cover';
      banner.style.backgroundPosition = 'center';
    }
    if (h.textColor) banner.style.color = h.textColor;
    if (h.font)      banner.style.fontFamily = `"${h.font}", cursive`;
    banner.style.setProperty('--banner-overlay', h.overlayOpacity || 0);
  }
}

// ── Products ───────────────────────────────────────────────────
async function loadAndRender() {
  const grid  = document.getElementById('productGrid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '<p class="loading-state">Lädt...</p>';

  let products;
  try {
    products = await fetch('/products').then(r => r.json());
  } catch {
    grid.innerHTML = '';
    empty.textContent = 'Fehler beim Laden.';
    empty.classList.remove('hidden');
    return;
  }

  const visible = products.filter(p => p.visible);
  grid.innerHTML = '';

  if (visible.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  applySettings();

  const s = JSON.parse(localStorage.getItem('themeSettings') || '{}');
  const btnText = s.buttonStyle?.text || 'In den Warenkorb';

  visible.forEach(p => {
    const imgs = getImages(p);
    const imgHTML = imgs[0]
      ? `<img src="${imgs[0]}" alt="${esc(p.name)}" class="product-img" loading="lazy">`
      : `<div class="product-img-placeholder"><span>NO IMAGE</span></div>`;

    const badgeClass = {
      'NEW': 'product-badge-new',
      'LIMITED': 'product-badge-limited',
      'DROP': 'product-badge-drop',
      'SOLD OUT': 'product-badge-soldout',
    }[p.badge] || '';
    const badgeHTML = p.badge
      ? `<span class="product-badge ${badgeClass}">${esc(p.badge)}</span>` : '';

    const discount = p.discountPrice && p.discountPrice < p.price;
    const priceHTML = discount
      ? `<span class="product-price">${formatPrice(p.discountPrice)}</span>
         <span style="font-size:.8rem;text-decoration:line-through;color:rgba(255,255,255,.3);margin-left:6px">${formatPrice(p.price)}</span>`
      : `<span class="product-price">${formatPrice(p.price)}</span>`;

    const card = document.createElement('div');
    card.className = 'product-card scroll-reveal';
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="product-img-wrap">
        ${imgHTML}
        ${badgeHTML}
        ${imgs.length > 1 ? `<span style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:rgba(255,255,255,.7);font-size:10px;padding:3px 7px;border-radius:4px;">+${imgs.length-1}</span>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${esc(p.name)}</h3>
        ${p.description ? `<p class="product-desc">${esc(p.description)}</p>` : ''}
        ${p.sizes && p.sizes.length ? `
          <div class="card-sizes">
            ${p.sizes.map(s => `<button class="card-size-btn" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>` : ''}
        <div class="product-footer">
          <div>${priceHTML}</div>
          <button class="btn-add-cart" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.discountPrice || p.price}">
            ${esc(btnText)}
          </button>
        </div>
      </div>
    `;

    // Click card → open detail
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-add-cart') && !e.target.closest('.btn-add-cart')) {
        openProductDetail(p);
      }
    });

    // Size button toggle
    card.querySelectorAll('.card-size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.querySelectorAll('.card-size-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    card.querySelector('.btn-add-cart').addEventListener('click', (e) => {
      e.stopPropagation();
      const hasSizes = p.sizes && p.sizes.length > 0;
      const selectedBtn = card.querySelector('.card-size-btn.selected');
      if (hasSizes && !selectedBtn) {
        // Highlight size section to prompt selection
        const sizesEl = card.querySelector('.card-sizes');
        sizesEl.classList.add('shake');
        setTimeout(() => sizesEl.classList.remove('shake'), 600);
        return;
      }
      const selectedSize = selectedBtn ? selectedBtn.dataset.size : null;
      const label = selectedSize ? `${p.name} · ${selectedSize}` : p.name;
      addToCart(String(p.id) + (selectedSize || ''), label, p.discountPrice || p.price, getImages(p)[0] || '');
    });

    grid.appendChild(card);
  });

  // Scroll reveal
  const s2 = JSON.parse(localStorage.getItem('themeSettings') || '{}');
  if (s2.effects?.scrollAnimations !== false) initScrollReveal();
  else document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('visible'));
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// ── Product Detail ─────────────────────────────────────────────
function openProductDetail(p) {
  pdProduct = p;
  pdQty     = 1;
  pdSize    = null;
  pdColor   = null;

  const modal = document.getElementById('productDetail');
  const imgs  = getImages(p);

  // Name, description
  document.getElementById('pdName').textContent = p.name;
  document.getElementById('pdDesc').textContent = p.description || '';

  // Price
  const priceEl    = document.getElementById('pdPrice');
  const origEl     = document.getElementById('pdOriginalPrice');
  const discBadge  = document.getElementById('pdDiscountBadge');
  const activePrice = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
  priceEl.textContent = formatPrice(activePrice);
  if (p.discountPrice && p.discountPrice < p.price) {
    origEl.textContent    = formatPrice(p.price);
    origEl.style.display  = '';
    const pct = Math.round((1 - p.discountPrice / p.price) * 100);
    discBadge.textContent  = `-${pct}%`;
    discBadge.style.display = '';
  } else {
    origEl.style.display  = 'none';
    discBadge.style.display = 'none';
  }

  // Badge
  const badgeWrap = document.getElementById('pdBadgeWrap');
  badgeWrap.innerHTML = '';
  if (p.badge) {
    const cls = { NEW:'pd-badge-new',LIMITED:'pd-badge-limited',DROP:'pd-badge-drop','SOLD OUT':'pd-badge-soldout' }[p.badge] || '';
    badgeWrap.innerHTML = `<span class="pd-badge ${cls}">${esc(p.badge)}</span>`;
  }
  if (p.category) {
    badgeWrap.innerHTML += `<span class="pd-badge" style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.08)">${esc(p.category)}</span>`;
  }

  // Gallery
  const mainImg = document.getElementById('pdMainImg');
  const mainPlaceholder = document.getElementById('pdMainPlaceholder');
  const thumbsEl = document.getElementById('pdThumbs');

  pdImgs       = imgs;
  pdCurrentIdx = 0;

  if (imgs.length > 0) {
    mainImg.src = imgs[0];
    mainImg.alt = p.name;
    mainImg.style.display = '';
    mainPlaceholder.style.display = 'none';
    thumbsEl.innerHTML = imgs.map((src, i) => `
      <img class="pd-thumb ${i === 0 ? 'active' : ''}" src="${src}" alt="Bild ${i+1}"
           data-idx="${i}" loading="lazy">
    `).join('');
    thumbsEl.querySelectorAll('.pd-thumb').forEach(t => {
      t.addEventListener('click', () => switchImage(parseInt(t.dataset.idx), imgs));
    });
  } else {
    mainImg.style.display = 'none';
    mainPlaceholder.style.display = '';
    thumbsEl.innerHTML = '';
  }
  updateGalleryDots(imgs.length, 0);

  // Sizes
  const sizeSec = document.getElementById('pdSizesSection');
  const sizesEl = document.getElementById('pdSizes');
  if (p.sizes && p.sizes.length) {
    sizeSec.style.display = '';
    sizesEl.innerHTML = p.sizes.map(s => `
      <button class="pd-size-btn" data-size="${esc(s)}">${esc(s)}</button>
    `).join('');
    sizesEl.querySelectorAll('.pd-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sizesEl.querySelectorAll('.pd-size-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        pdSize = btn.dataset.size;
      });
    });
  } else {
    sizeSec.style.display = 'none';
  }

  // Colors
  const colorSec = document.getElementById('pdColorsSection');
  const colorsEl = document.getElementById('pdColors');
  if (p.colors && p.colors.length) {
    colorSec.style.display = '';
    colorsEl.innerHTML = p.colors.map((c, i) => `
      <button class="pd-color-btn" data-color="${esc(c)}" data-idx="${i}"
        style="background:${esc(c)}" title="${esc(c)}"></button>
    `).join('');
    colorsEl.querySelectorAll('.pd-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        colorsEl.querySelectorAll('.pd-color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        pdColor = btn.dataset.color;
      });
    });
  } else {
    colorSec.style.display = 'none';
  }

  // Qty
  document.getElementById('pdQtyNum').textContent = '1';

  // Cart button text
  const s = JSON.parse(localStorage.getItem('themeSettings') || '{}');
  document.getElementById('pdAddCart').textContent = s.buttonStyle?.text || 'In den Warenkorb';

  // Open
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function switchImage(idx, imgs) {
  pdCurrentIdx = idx;
  const mainImg = document.getElementById('pdMainImg');
  const thumbs  = document.querySelectorAll('.pd-thumb');
  mainImg.classList.remove('pd-img-fade');
  void mainImg.offsetWidth;
  mainImg.src = imgs[idx];
  mainImg.classList.add('pd-img-fade');
  thumbs.forEach((t, i) => t.classList.toggle('active', i === idx));
  updateGalleryDots(imgs.length, idx);
  // Scroll thumb into view
  thumbs[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function updateGalleryDots(total, active) {
  let dotsEl = document.getElementById('pdGalleryDots');
  if (total <= 1) { if (dotsEl) dotsEl.style.display = 'none'; return; }
  if (!dotsEl) {
    dotsEl = document.createElement('div');
    dotsEl.id = 'pdGalleryDots';
    dotsEl.style.cssText = 'position:absolute;bottom:48px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:5;pointer-events:none;';
    document.getElementById('pdMainWrap').appendChild(dotsEl);
  }
  dotsEl.style.display = 'flex';
  dotsEl.innerHTML = Array.from({ length: total }, (_, i) =>
    `<span style="width:${i===active?'18px':'6px'};height:6px;border-radius:3px;background:${i===active?'#fff':'rgba(255,255,255,.35)'};transition:all .25s;display:block;"></span>`
  ).join('');
}

function closeProductDetail() {
  document.getElementById('productDetail').classList.remove('open');
  document.body.style.overflow = '';
  pdProduct = null;
}

// Qty controls
document.getElementById('pdQtyMinus').addEventListener('click', () => {
  if (pdQty > 1) { pdQty--; document.getElementById('pdQtyNum').textContent = pdQty; }
});
document.getElementById('pdQtyPlus').addEventListener('click', () => {
  pdQty++;
  document.getElementById('pdQtyNum').textContent = pdQty;
});

// Add to cart from detail
document.getElementById('pdAddCart').addEventListener('click', () => {
  if (!pdProduct) return;
  const p     = pdProduct;
  const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
  const label = [p.name, pdSize, pdColor].filter(Boolean).join(' · ');
  for (let i = 0; i < pdQty; i++) addToCart(String(p.id), label, price, getImages(p)[0] || '');

  const btn = document.getElementById('pdAddCart');
  btn.textContent = '✓ Hinzugefügt';
  btn.classList.add('added');
  setTimeout(() => {
    const s = JSON.parse(localStorage.getItem('themeSettings') || '{}');
    btn.textContent = s.buttonStyle?.text || 'In den Warenkorb';
    btn.classList.remove('added');
  }, 1600);
});

// Close handlers
document.getElementById('pdClose').addEventListener('click', closeProductDetail);
document.getElementById('pdBackdrop').addEventListener('click', closeProductDetail);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeProductDetail();
    closeLightbox();
  }
});

// Fullscreen / lightbox
document.getElementById('pdFullscreenBtn').addEventListener('click', () => {
  const src = document.getElementById('pdMainImg').src;
  if (!src || document.getElementById('pdMainImg').style.display === 'none') return;
  document.getElementById('pdLightboxImg').src = src;
  document.getElementById('pdLightbox').classList.add('open');
});
function closeLightbox() {
  document.getElementById('pdLightbox').classList.remove('open');
}
document.getElementById('pdLightboxClose').addEventListener('click', closeLightbox);
document.getElementById('pdLightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLightbox();
});

// ── Cart ───────────────────────────────────────────────────────
function addToCart(id, name, price, image) {
  const existing = cart.find(i => i.id === id && i.name === name);
  if (existing) existing.qty++;
  else cart.push({ id, name, price, qty: 1, image: image || '' });
  updateCartCount();
  flashCartButton();
  renderCartItems();
}

function removeFromCart(key) {
  cart = cart.filter(i => i._key !== key);
  updateCartCount();
  renderCartItems();
}

function changeQty(key, delta) {
  const item = cart.find(i => i._key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(key);
  else { updateCartCount(); renderCartItems(); }
}

function updateCartCount() {
  document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function renderCartItems() {
  // Add stable keys
  let idx = 0;
  cart.forEach(i => { if (!i._key) i._key = 'k' + (idx++); });

  const container = document.getElementById('cartItems');
  const totalEl   = document.getElementById('cartTotal');

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Dein Warenkorb ist leer.</p>';
    totalEl.textContent = '0,00 €';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.image ? `<img class="cart-item-img" src="${esc(item.image)}" alt="">` : '<div class="cart-item-img cart-item-img--empty"></div>'}
      <div class="cart-item-info">
        <span class="cart-item-name">${esc(item.name)}</span>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-key="${item._key}" data-delta="-1">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-key="${item._key}" data-delta="1">+</button>
        <button class="remove-btn" data-key="${item._key}">✕</button>
      </div>
    </div>
  `).join('');

  totalEl.textContent = formatPrice(cart.reduce((s, i) => s + i.price * i.qty, 0));

  container.querySelectorAll('.qty-btn').forEach(btn =>
    btn.addEventListener('click', () =>
      changeQty(btn.dataset.key, parseInt(btn.dataset.delta))
    )
  );
  container.querySelectorAll('.remove-btn').forEach(btn =>
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key))
  );
}

function openCart() {
  renderCartItems();
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.remove('hidden');
}
function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.add('hidden');
}
function flashCartButton() {
  const btn = document.getElementById('cartToggle');
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 400);
}

// ── Checkout (multi-step) ──────────────────────────────────────
let _payConfig    = null;
let _paypalLoaded = false;

function coGoto(step) {
  [1, 2, 3].forEach(n => {
    document.getElementById('coPane' + n).classList.toggle('active', n === step);
    const dot = document.getElementById('coStepDot' + n);
    if (!dot) return;
    dot.classList.toggle('active', n <= step);
    dot.classList.toggle('done', n < step);
  });
}

async function openCheckout() {
  if (cart.length === 0) return;
  closeCart();

  if (!_payConfig) {
    _payConfig = await fetch('/payment-config').then(r => r.json()).catch(() => ({
      paypalEnabled: false, manualEnabled: true, manualInstructions: '',
      currency: 'EUR', shippingFree: true, shippingCost: 4.99,
    }));
  }

  const sub      = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = _payConfig.shippingFree ? 0 : (_payConfig.shippingCost || 0);
  const total    = sub + shipping;

  document.getElementById('co_items_list').innerHTML = cart.map(i => `
    <div class="co-item-row">
      ${i.image
        ? `<img src="${i.image}" class="co-item-img" alt="">`
        : `<div class="co-item-img co-item-img-ph"></div>`}
      <div class="co-item-info">
        <span class="co-item-name">${esc(i.name)}</span>
        <span class="co-item-qty">× ${i.qty}</span>
      </div>
      <span class="co-item-price">${formatPrice(i.price * i.qty)}</span>
    </div>
  `).join('');
  document.getElementById('co_subtotal').textContent = formatPrice(sub);
  document.getElementById('co_shipping').textContent = _payConfig.shippingFree
    ? 'Kostenlos' : formatPrice(shipping);
  document.getElementById('co_total').textContent = formatPrice(total);

  coGoto(1);
  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
}

function coValidateStep1() {
  const fields = ['co_name', 'co_email', 'co_street', 'co_zip', 'co_city'];
  let ok = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    const empty = !el.value.trim();
    el.classList.toggle('co-invalid', empty);
    if (empty) ok = false;
  });
  return ok;
}

function getCustomerInfo() {
  return {
    name:    document.getElementById('co_name').value.trim(),
    email:   document.getElementById('co_email').value.trim(),
    phone:   document.getElementById('co_phone').value.trim(),
    street:  document.getElementById('co_street').value.trim(),
    zip:     document.getElementById('co_zip').value.trim(),
    city:    document.getElementById('co_city').value.trim(),
    country: document.getElementById('co_country').value,
    note:    document.getElementById('co_note').value.trim(),
  };
}

function coGotoStep2() {
  if (!coValidateStep1()) return;
  const info  = getCustomerInfo();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
              + (_payConfig?.shippingFree ? 0 : _payConfig?.shippingCost || 0);
  document.getElementById('co_pay_summary').innerHTML = `
    <div><strong>${esc(info.name)}</strong> · ${esc(info.email)}</div>
    <div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:3px">
      ${esc(info.street)}, ${esc(info.zip)} ${esc(info.city)}
    </div>
    <div class="co-pay-total">${formatPrice(total)} gesamt</div>
  `;
  coGoto(2);
  initPaymentOptions();
}

async function initPaymentOptions() {
  const cfg     = _payConfig;
  const ppWrap  = document.getElementById('coPaypalWrap');
  const mWrap   = document.getElementById('coManualWrap');
  const loading = document.getElementById('coPayLoading');
  const divider = document.getElementById('coPayDivider');
  const hintEl  = document.getElementById('coManualHint');

  ppWrap.style.display  = 'none';
  mWrap.style.display   = 'none';
  divider.style.display = 'none';
  loading.style.display = '';

  hintEl.textContent = cfg.manualInstructions || '';

  if (cfg.paypalEnabled && cfg.paypalClientId) {
    await loadPaypalSDK(cfg);
    ppWrap.style.display = '';
    if (cfg.manualEnabled) divider.style.display = '';
    renderPaypalButtons();
  }
  if (cfg.manualEnabled) mWrap.style.display = '';
  loading.style.display = 'none';
}

function loadPaypalSDK(cfg) {
  if (_paypalLoaded) return Promise.resolve();
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src   = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.paypalClientId)}&currency=${cfg.currency || 'EUR'}&intent=capture`;
    s.onload  = () => { _paypalLoaded = true; resolve(); };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

function renderPaypalButtons() {
  const container = document.getElementById('paypal-button-container');
  container.innerHTML = '';
  if (typeof paypal === 'undefined') {
    container.innerHTML = '<p style="color:rgba(255,255,255,.4);font-size:13px;padding:8px 0">PayPal konnte nicht geladen werden.</p>';
    return;
  }
  paypal.Buttons({
    style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'paypal' },

    createOrder: async () => {
      const res  = await fetch('/checkout/create-paypal-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items: cart.map(i => ({ id: i.id, qty: i.qty })) }),
      });
      const data = await res.json();
      if (!data.id) throw new Error('Order creation failed');
      return data.id;
    },

    onApprove: async (data) => {
      document.getElementById('coPayLoading').style.display = '';
      try {
        const res    = await fetch('/checkout/capture-paypal-order', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            paypalOrderId: data.orderID,
            customerInfo:  getCustomerInfo(),
            items:         cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          }),
        });
        const result = await res.json();
        if (result.success) {
          const info = getCustomerInfo();
          onOrderSuccess(info.name, info.email, result.orderId);
        } else {
          alert('Zahlung fehlgeschlagen. Bitte erneut versuchen.');
        }
      } catch (err) {
        alert('Fehler: ' + err.message);
      } finally {
        document.getElementById('coPayLoading').style.display = 'none';
      }
    },

    onError: (err) => { console.error('PayPal error', err); },
  }).render('#paypal-button-container');
}

async function submitManualOrder() {
  const btn  = document.getElementById('coBtnManual');
  btn.disabled    = true;
  btn.textContent = '⏳ Bestellung wird gesendet…';
  try {
    const info    = getCustomerInfo();
    const total   = cart.reduce((s, i) => s + i.price * i.qty, 0)
                  + (_payConfig?.shippingFree ? 0 : _payConfig?.shippingCost || 0);
    const res  = await fetch('/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...info,
        items:         cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image || '' })),
        total,
        currency:      _payConfig?.currency || 'EUR',
        paymentMethod: 'manual',
        status:        'pending',
      }),
    });
    const data = await res.json();
    onOrderSuccess(info.name, info.email, data.orderId || ('ORD-' + Date.now()));
  } catch {
    btn.disabled    = false;
    btn.textContent = '📧 Bestellung ohne Vorauszahlung senden';
    alert('Fehler beim Senden. Bitte erneut versuchen.');
  }
}

function onOrderSuccess(name, email, orderId) {
  cart = [];
  updateCartCount();
  document.getElementById('coSuccessMsg').textContent =
    `Danke, ${name}! Deine Bestellung ist eingegangen. Wir melden uns bei ${email}.`;
  document.getElementById('coOrderNum').textContent = `Bestellnummer: ${orderId}`;
  coGoto(3);
  document.getElementById('coForm1').reset();
}

// ── Visual Effects ─────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  canvas.style.display = '';
  const ctx    = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const particles = Array.from({ length: 55 }, () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    r:  Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    a:  Math.random() * 0.4 + 0.08,
  }));

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent').trim() || '#ff2d55';
    particles.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = accent + Math.round(p.a * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
    _particleRAF = requestAnimationFrame(tick);
  }
  if (_particleRAF) cancelAnimationFrame(_particleRAF);
  tick();
}

function stopParticles() {
  if (_particleRAF) { cancelAnimationFrame(_particleRAF); _particleRAF = null; }
  const canvas = document.getElementById('particleCanvas');
  if (canvas) { canvas.style.display = 'none'; const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height); }
}

function initCursor() {
  if (document.getElementById('dvCursor')) return;
  const dot   = document.createElement('div');
  const trail = document.createElement('div');
  dot.id    = 'dvCursor';
  trail.id  = 'dvTrail';
  dot.className   = 'custom-cursor';
  trail.className = 'cursor-trail';
  document.body.append(dot, trail);
  let tx = -100, ty = -100, cx = -100, cy = -100;
  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function animate() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    dot.style.left   = tx + 'px';
    dot.style.top    = ty + 'px';
    trail.style.left = cx + 'px';
    trail.style.top  = cy + 'px';
    requestAnimationFrame(animate);
  })();
}

// ── Event wiring ───────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click',   () => Auth.logout());
document.getElementById('cartToggle').addEventListener('click',  openCart);
document.getElementById('cartClose').addEventListener('click',   closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
document.getElementById('checkoutBackdrop').addEventListener('click', closeCheckout);

document.getElementById('coForm1').addEventListener('submit', e => {
  e.preventDefault();
  coGotoStep2();
});

document.getElementById('coForm1').addEventListener('input', e => {
  if (e.target.required) e.target.classList.remove('co-invalid');
});

document.getElementById('coBack').addEventListener('click', () => coGoto(1));
document.getElementById('coBtnManual').addEventListener('click', submitManualOrder);
document.getElementById('coDone').addEventListener('click', closeCheckout);

// ── Touch swipe: gallery images ────────────────────────────────
(function () {
  const wrap = document.getElementById('pdMainWrap');
  let sx = 0, sy = 0;
  wrap.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  wrap.addEventListener('touchend', e => {
    if (!pdImgs.length) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      const next = (pdCurrentIdx + (dx < 0 ? 1 : -1) + pdImgs.length) % pdImgs.length;
      switchImage(next, pdImgs);
    }
  }, { passive: true });
})();

// ── Swipe-down to close product detail on mobile ───────────────
(function () {
  const panel = document.querySelector('.pd-panel');
  let sy = 0;
  panel.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  panel.addEventListener('touchend', e => {
    if (window.innerWidth > 700) return;
    const dy = e.changedTouches[0].clientY - sy;
    if (dy > 80) closeProductDetail();
  }, { passive: true });
})();

// ── Boot ───────────────────────────────────────────────────────
loadAndRender();
