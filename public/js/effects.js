/* ============================================================
   DRIP VAULT — Premium Visual Effects Engine
   ============================================================ */
'use strict';

const DVEffects = (() => {
  const _inst = {};

  /* ── helpers ───────────────────────────────────────────── */
  function hexDarken(hex, amt) {
    const n = parseInt((hex || '#4CAF50').replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (n >> 16)         + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xff)        + amt));
    return `rgb(${r},${g},${b})`;
  }

  function makeCanvas(z) {
    const c = document.createElement('canvas');
    Object.assign(c.style, {
      position:'fixed',inset:'0',pointerEvents:'none',zIndex: z || '9990',
    });
    document.body.appendChild(c);
    return c;
  }

  /* ── Dollar Effect ─────────────────────────────────────── */
  class DollarEffect {
    constructor(cfg) {
      this.cfg = cfg;
      this.canvas = makeCanvas(9996);
      this.ctx    = this.canvas.getContext('2d');
      this.items  = [];
      this.raf    = null;
      this._r     = () => this.resize();
      window.addEventListener('resize', this._r);
      this.resize();
      this.spawn();
      this.tick();
    }

    resize() {
      this.W = this.canvas.width  = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
    }

    mkItem(init) {
      const { minSize = 24, maxSize = 56, speed = 1, opacity = 0.2 } = this.cfg;
      const size = minSize + Math.random() * (maxSize - minSize);
      return {
        x: Math.random() * this.W,
        y: init ? Math.random() * this.H : -size * 2,
        size,
        rot:      (Math.random() - 0.5) * Math.PI * 2,
        rotSpd:   (Math.random() - 0.5) * 0.025,
        spd:      speed * (0.5 + Math.random()),
        swAmp:    15 + Math.random() * 30,
        swSpd:    0.5 + Math.random(),
        swOff:    Math.random() * Math.PI * 2,
        op:       opacity * (0.45 + Math.random() * 0.7),
      };
    }

    spawn() {
      this.items = Array.from({ length: this.cfg.count || 15 }, (_, i) => this.mkItem(true));
    }

    draw(d, t) {
      const { ctx } = this;
      const { size, rot, op } = d;
      const color = this.cfg.color || '#4CAF50';
      const r = size * 0.48;

      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(rot);
      ctx.globalAlpha = op;

      /* base circle */
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      grad.addColorStop(0, '#b8f5b8');
      grad.addColorStop(0.25, color);
      grad.addColorStop(0.65, hexDarken(color, -40));
      grad.addColorStop(1,    hexDarken(color, -70));
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur  = size * 0.3;
      ctx.shadowOffsetY = size * 0.07;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      /* shine highlight */
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      const hi = ctx.createRadialGradient(-r * 0.28, -r * 0.32, 0, -r * 0.1, -r * 0.1, r * 0.6);
      hi.addColorStop(0, 'rgba(255,255,255,0.48)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = hi;
      ctx.fill();

      /* $ label */
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.font = `bold ${size * 0.54}px Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);

      ctx.restore();
    }

    tick() {
      const t = performance.now() / 1000;
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.items.forEach(d => {
        d.y   += d.spd;
        d.x   += Math.sin(t * d.swSpd + d.swOff) * 0.45;
        d.rot += d.rotSpd;
        if (d.y > this.H + d.size * 2) Object.assign(d, this.mkItem(false));
        this.draw(d, t);
      });
      this.raf = requestAnimationFrame(() => this.tick());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this._r);
      this.canvas.remove();
    }
  }

  /* ── Gold Particles ─────────────────────────────────────── */
  class GoldParticles {
    constructor(cfg) {
      this.cfg  = cfg;
      this.canvas = makeCanvas(9994);
      this.ctx    = this.canvas.getContext('2d');
      this.pts    = [];
      this.raf    = null;
      this._r     = () => this.resize();
      window.addEventListener('resize', this._r);
      this.resize();
      this.spawn();
      this.tick();
    }

    resize() {
      this.W = this.canvas.width  = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
    }

    mkPt(init) {
      const { size = 2.5, speed = 0.4, opacity = 0.7 } = this.cfg;
      const s = size * (0.4 + Math.random() * 1.4);
      return {
        x:   Math.random() * (this.W || window.innerWidth),
        y:   init ? Math.random() * (this.H || window.innerHeight) : (this.H || window.innerHeight) + s,
        sz:  s,
        vx:  (Math.random() - 0.5) * 0.4,
        vy:  -(speed * (0.3 + Math.random() * 0.7)),
        op:  opacity * (0.3 + Math.random() * 0.75),
        ph:  Math.random() * Math.PI * 2,
        phSpd: 1 + Math.random() * 2.5,
      };
    }

    spawn() {
      this.pts = Array.from({ length: this.cfg.count || 40 }, () => this.mkPt(true));
    }

    tick() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      const t = performance.now() / 1000;
      this.pts.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.ph += p.phSpd * 0.016;
        const pulse = 0.65 + Math.sin(p.ph) * 0.35;
        if (p.y < -p.sz * 3) Object.assign(p, this.mkPt(false));
        const s = p.sz * pulse;
        ctx.save();
        ctx.globalAlpha = p.op * pulse;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur  = s * 5;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2.2);
        g.addColorStop(0, '#FFFDE7');
        g.addColorStop(0.35, '#FFD700');
        g.addColorStop(1, 'rgba(255,165,0,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      });
      this.raf = requestAnimationFrame(() => this.tick());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this._r);
      this.canvas.remove();
    }
  }

  /* ── Confetti ───────────────────────────────────────────── */
  class Confetti {
    constructor(cfg) {
      this.cfg    = cfg;
      this.COLORS = ['#ff2d55','#FFD700','#5b8dee','#34d399','#f59e0b','#a78bfa','#fb923c'];
      this.canvas = makeCanvas(9993);
      this.ctx    = this.canvas.getContext('2d');
      this.pcs    = [];
      this.raf    = null;
      this._r     = () => this.resize();
      window.addEventListener('resize', this._r);
      this.resize();
      this.spawn();
      this.tick();
    }

    resize() {
      this.W = this.canvas.width  = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
    }

    mkPc(init) {
      const { speed = 1.5, opacity = 0.9 } = this.cfg;
      return {
        x:     Math.random() * this.W,
        y:     init ? Math.random() * this.H : -20,
        w:     5 + Math.random() * 10,
        h:     3 + Math.random() * 6,
        color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
        rot:   Math.random() * Math.PI * 2,
        rotSpd:(Math.random() - 0.5) * 0.1,
        vy:    speed * (0.6 + Math.random() * 0.9),
        vx:    (Math.random() - 0.5) * 1.5,
        op:    opacity * (0.5 + Math.random() * 0.5),
        circle: Math.random() > 0.55,
      };
    }

    spawn() {
      this.pcs = Array.from({ length: this.cfg.count || 40 }, () => this.mkPc(true));
    }

    tick() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      this.pcs.forEach(p => {
        p.x   += p.vx; p.y += p.vy; p.rot += p.rotSpd;
        if (p.y > this.H + 20) Object.assign(p, this.mkPc(false));
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.circle) {
          ctx.beginPath(); ctx.arc(0, 0, p.w * 0.5, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
        }
        ctx.restore();
      });
      this.raf = requestAnimationFrame(() => this.tick());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this._r);
      this.canvas.remove();
    }
  }

  /* ── Sparkle ────────────────────────────────────────────── */
  class Sparkle {
    constructor(cfg) {
      this.cfg    = cfg;
      this.canvas = makeCanvas(9992);
      this.ctx    = this.canvas.getContext('2d');
      this.stars  = [];
      this.raf    = null;
      this._r     = () => this.resize();
      window.addEventListener('resize', this._r);
      this.resize();
      this.spawn();
      this.tick();
    }

    resize() {
      this.W = this.canvas.width  = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
    }

    mkStar() {
      const { size = 4, speed = 1 } = this.cfg;
      return {
        x:    Math.random() * this.W,
        y:    Math.random() * this.H,
        sz:   size * (0.4 + Math.random() * 1.4),
        rot:  Math.random() * Math.PI,
        life: Math.random(),
        lifeSpd: speed * (0.008 + Math.random() * 0.012),
      };
    }

    spawn() {
      this.stars = Array.from({ length: this.cfg.count || 20 }, () => this.mkStar());
    }

    drawStar(ctx, x, y, size, rot, alpha) {
      const c = this.cfg.color || '#FFD700';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = c;
      ctx.shadowBlur  = size * 3;
      ctx.fillStyle   = c;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const b = ((i + 0.5) / 4) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else         ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
        ctx.lineTo(Math.cos(b) * size * 0.22, Math.sin(b) * size * 0.22);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    tick() {
      this.ctx.clearRect(0, 0, this.W, this.H);
      this.stars.forEach(s => {
        s.life += s.lifeSpd;
        s.rot  += 0.012;
        if (s.life >= 1) { Object.assign(s, this.mkStar()); s.life = 0; }
        const alpha = Math.sin(s.life * Math.PI) * 0.88;
        if (alpha > 0) this.drawStar(this.ctx, s.x, s.y, s.sz, s.rot, alpha);
      });
      this.raf = requestAnimationFrame(() => this.tick());
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this._r);
      this.canvas.remove();
    }
  }

  /* ── Light Leak (DOM) ───────────────────────────────────── */
  class LightLeak {
    constructor(cfg) {
      this.el = document.createElement('div');
      this.el.className = 'dv-light-leak';
      document.body.appendChild(this.el);
      const op  = cfg.opacity  || 0.12;
      const dur = cfg.speed    || 8;
      this.el.style.setProperty('--ll-op',  op);
      this.el.style.setProperty('--ll-dur', dur + 's');
    }
    destroy() { this.el.remove(); }
  }

  /* ── Glitch (CSS class) ─────────────────────────────────── */
  function applyGlitch(cfg) {
    document.body.classList.add('fx-glitch');
    document.querySelectorAll('.site-title, h1.login-headline').forEach(el => {
      el.classList.add('glitch-title');
      if (!el.dataset.text) el.dataset.text = el.textContent;
      el.style.setProperty('--glitch-freq', (cfg.frequency || 4) + 's');
    });
  }
  function removeGlitch() {
    document.body.classList.remove('fx-glitch');
    document.querySelectorAll('.glitch-title').forEach(el => {
      el.classList.remove('glitch-title');
    });
  }

  /* ── 3D Card Tilt ───────────────────────────────────────── */
  function wireCard(card, intensity, shine) {
    if (card._dvTilt) return;
    card._dvTilt = true;
    let shineEl;
    if (shine) {
      shineEl = document.createElement('div');
      shineEl.className = 'card-shine';
      card.appendChild(shineEl);
    }
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform  = `perspective(800px) rotateY(${x*intensity}deg) rotateX(${-y*intensity}deg) scale(1.025) translateZ(8px)`;
      card.style.transition = 'transform 0.05s ease';
      if (shineEl) shineEl.style.background = `radial-gradient(ellipse at ${(x+0.5)*100}% ${(y+0.5)*100}%, rgba(255,255,255,0.18) 0%, transparent 65%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.4s ease';
      if (shineEl) shineEl.style.background = 'none';
    });
  }

  function init3DTilt(cfg) {
    const intensity = cfg.intensity || 12;
    const shine     = cfg.shine !== false;
    document.querySelectorAll('.product-card').forEach(c => wireCard(c, intensity, shine));
    if (!window._dvTiltObs) {
      window._dvTiltObs = new MutationObserver(ms => {
        ms.forEach(m => m.addedNodes.forEach(n => {
          if (n.nodeType === 1) {
            if (n.classList?.contains('product-card')) wireCard(n, intensity, shine);
            n.querySelectorAll?.('.product-card').forEach(c => wireCard(c, intensity, shine));
          }
        }));
      });
      window._dvTiltObs.observe(document.body, { childList: true, subtree: true });
    }
  }

  function remove3DTilt() {
    document.querySelectorAll('.product-card').forEach(card => {
      card._dvTilt = false;
      card.style.transform = '';
      card.querySelector('.card-shine')?.remove();
    });
    if (window._dvTiltObs) { window._dvTiltObs.disconnect(); delete window._dvTiltObs; }
  }

  /* ── Public: initVisualEffects ──────────────────────────── */
  function initVisualEffects(settings) {
    const ve = settings.visualEffects || {};

    /* Dollar signs */
    _inst.dollars?.destroy(); delete _inst.dollars;
    if (ve.dollars?.enabled) _inst.dollars = new DollarEffect(ve.dollars);

    /* Gold particles */
    _inst.goldParticles?.destroy(); delete _inst.goldParticles;
    if (ve.goldParticles?.enabled) _inst.goldParticles = new GoldParticles(ve.goldParticles);

    /* Confetti */
    _inst.confetti?.destroy(); delete _inst.confetti;
    if (ve.confetti?.enabled) _inst.confetti = new Confetti(ve.confetti);

    /* Sparkle */
    _inst.sparkle?.destroy(); delete _inst.sparkle;
    if (ve.sparkle?.enabled) _inst.sparkle = new Sparkle(ve.sparkle);

    /* Light Leak */
    _inst.lightLeak?.destroy(); delete _inst.lightLeak;
    if (ve.lightLeak?.enabled) _inst.lightLeak = new LightLeak(ve.lightLeak);

    /* Glitch */
    if (ve.glitch?.enabled) applyGlitch(ve.glitch);
    else removeGlitch();

    /* 3D Card Tilt */
    if (ve.cardTilt3D?.enabled) init3DTilt(ve.cardTilt3D);
    else remove3DTilt();
  }

  return { initVisualEffects };
})();
