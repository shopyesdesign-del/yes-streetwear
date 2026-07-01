/* ============================================================
   DRIP VAULT — Brand Cursor System
   ============================================================ */
'use strict';

const DVCursor = (() => {
  let cfg = {}, curEl = null, trailEl = null, pCanvas = null;
  let raf = null, rotDeg = 0;
  let cx = 0, cy = 0, tx = 0, ty = 0, tcx = 0, tcy = 0;
  let particles = [];
  const LERP  = 0.22;
  const LERPT = 0.08;

  const isTouch = () =>
    window.matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;

  /* ── Build DOM ─────────────────────────────────────────────── */
  function buildCursor() {
    const size = cfg.size || 32;
    const op   = cfg.opacity !== undefined ? cfg.opacity : 0.9;

    curEl = document.createElement('div');
    curEl.id = 'dv-cursor';
    curEl.className = 'dv-cursor anim-' + (cfg.animation || 'none');

    /* content */
    if (cfg.imageUrl) {
      curEl.style.backgroundImage = `url(${cfg.imageUrl})`;
      curEl.style.backgroundSize  = 'contain';
      curEl.style.backgroundRepeat= 'no-repeat';
      curEl.style.backgroundPosition = 'center';
    } else if (cfg.useLogo) {
      const logoImg = document.querySelector('.shop-header img[class*=logo], img.logo-img, #shopLogoImg');
      if (logoImg) {
        curEl.style.backgroundImage = `url(${logoImg.src})`;
        curEl.style.backgroundSize  = 'contain';
        curEl.style.backgroundRepeat= 'no-repeat';
        curEl.style.backgroundPosition = 'center';
      } else {
        curEl.innerHTML = '<span class="cursor-dv-text">DV</span>';
      }
    } else {
      curEl.innerHTML = `<svg viewBox="0 0 32 32" width="${size}" height="${size}">
        <circle cx="16" cy="16" r="7" fill="${cfg.glowColor||'#ff2d55'}"/>
        <circle cx="16" cy="16" r="3.5" fill="#fff"/>
      </svg>`;
    }

    Object.assign(curEl.style, {
      width: size + 'px', height: size + 'px',
      opacity: op,
    });
    if (cfg.animation === 'glow') {
      curEl.style.setProperty('--cursor-glow', cfg.glowColor || '#ff2d55');
      curEl.style.setProperty('--cursor-glow-size', (cfg.glowSize || 20) + 'px');
    }
    document.body.appendChild(curEl);

    /* trail */
    if (cfg.animation === 'trail' || cfg.animation === 'sticker') {
      trailEl = document.createElement('div');
      trailEl.id = 'dv-cursor-trail';
      trailEl.className = 'dv-cursor-trail';
      const ts = Math.round(size * 0.65);
      trailEl.style.cssText = `width:${ts}px;height:${ts}px;opacity:0.35;`;
      if (cfg.imageUrl)      trailEl.style.backgroundImage = `url(${cfg.imageUrl})`;
      else if (cfg.useLogo)  trailEl.style.backgroundImage = curEl.style.backgroundImage;
      trailEl.style.backgroundSize     = 'contain';
      trailEl.style.backgroundRepeat   = 'no-repeat';
      trailEl.style.backgroundPosition = 'center';
      document.body.appendChild(trailEl);
    }

    /* particle canvas */
    if (cfg.animation === 'particles') {
      pCanvas = document.createElement('canvas');
      Object.assign(pCanvas.style, {
        position:'fixed',inset:'0',pointerEvents:'none',zIndex:'999996',
      });
      pCanvas.width  = window.innerWidth;
      pCanvas.height = window.innerHeight;
      document.body.appendChild(pCanvas);
      window.addEventListener('resize', () => {
        pCanvas.width  = window.innerWidth;
        pCanvas.height = window.innerHeight;
      });
    }

    document.body.classList.add('dv-cursor-active');
  }

  /* ── Events ────────────────────────────────────────────────── */
  function onMove(e) {
    tx = e.clientX; ty = e.clientY;
    if (cfg.animation === 'particles') spawnParticle();
  }

  function spawnParticle() {
    particles.push({
      x: tx, y: ty,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -(Math.random() * 2.5 + 0.5),
      life: 1,
      size: 2 + Math.random() * 3.5,
    });
    if (particles.length > 80) particles.shift();
  }

  function onOver(e) {
    if (!curEl) return;
    const t    = e.target;
    const size = cfg.size || 32;
    const isBtn = t.closest('button, a, .btn-add-cart, .btn-login, .pd-add-cart, .pac-btn, [data-cursor="button"]');
    const isPrd = t.closest('.product-card, .product-admin-card, .col-product-card');
    const isImg = t.tagName === 'IMG' && !isPrd;

    curEl.classList.remove('state-button','state-product','state-image');
    let scale = 1;
    if (isBtn) {
      curEl.classList.add('state-button');
      scale = cfg.buttonScale || 1.6;
    } else if (isPrd) {
      curEl.classList.add('state-product');
      scale = cfg.productScale || 1.3;
    } else if (isImg) {
      curEl.classList.add('state-image');
    }
    curEl.style.width  = (size * scale) + 'px';
    curEl.style.height = (size * scale) + 'px';
    if (cfg.animation === 'glow') {
      const gsz = (cfg.glowSize || 20) * (isBtn ? 2.2 : 1);
      curEl.style.setProperty('--cursor-glow-size', gsz + 'px');
    }
  }

  /* ── Render loop ───────────────────────────────────────────── */
  function loop() {
    cx += (tx - cx) * LERP;
    cy += (ty - cy) * LERP;

    if (curEl) {
      rotDeg += cfg.animation === 'rotate' ? 1.8 : 0;
      const tx2 = Math.round(cx), ty2 = Math.round(cy);
      curEl.style.transform =
        `translate(calc(${tx2}px - 50%), calc(${ty2}px - 50%)) rotate(${rotDeg}deg)`;
    }

    if (trailEl) {
      tcx += (tx - tcx) * LERPT;
      tcy += (ty - tcy) * LERPT;
      trailEl.style.transform =
        `translate(calc(${Math.round(tcx)}px - 50%), calc(${Math.round(tcy)}px - 50%))`;
    }

    if (pCanvas) {
      const ctx = pCanvas.getContext('2d');
      ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      particles = particles.filter(p => p.life > 0);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.035;
        ctx.save();
        ctx.globalAlpha = p.life * 0.85;
        ctx.fillStyle   = cfg.glowColor || '#ff2d55';
        ctx.shadowColor = cfg.glowColor || '#ff2d55';
        ctx.shadowBlur  = p.size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    raf = requestAnimationFrame(loop);
  }

  /* ── Public API ────────────────────────────────────────────── */
  function init(settings) {
    cfg = (settings && settings.cursor) || {};
    destroy();
    if (!cfg.enabled || isTouch()) return;
    buildCursor();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    loop();
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf); raf = null;
    curEl?.remove();   curEl   = null;
    trailEl?.remove(); trailEl = null;
    pCanvas?.remove(); pCanvas = null;
    particles = []; cx = cy = tx = ty = tcx = tcy = rotDeg = 0;
    document.body.classList.remove('dv-cursor-active');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
  }

  return { init, destroy };
})();
