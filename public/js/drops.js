/* ============================================================
   DRIP VAULT — Drop Intro System
   ============================================================ */
'use strict';

const DVDrop = (() => {

  /* ── Intro configs ─────────────────────────────────────────── */
  const INTROS = {
    none:     { label: 'Kein Intro',          dur: 0 },
    graffiti: { label: 'Graffiti Reveal',     dur: 3200 },
    chrome:   { label: 'Chrome Luxury',       dur: 2800 },
    money:    { label: 'Money Drop',          dur: 2600 },
    album:    { label: 'Album Cover Style',   dur: 3000 },
    street:   { label: 'Street Night',        dur: 2800 },
    glitch:   { label: 'Glitch Drop',         dur: 2200 },
    spray:    { label: 'Spray Paint Reveal',  dur: 3000 },
  };

  /* ── Build overlay HTML ────────────────────────────────────── */
  function buildOverlay(type, name, accent) {
    const ac = accent || '#ff2d55';
    const el = document.createElement('div');
    el.className = 'drop-intro-overlay intro-' + type;
    el.setAttribute('role', 'dialog');

    const contentMap = {
      graffiti: `
        <div class="intro-graffiti-bg"></div>
        <div class="intro-text-wrap">
          <div class="intro-label">NEW DROP</div>
          <div class="intro-name graffiti-spray" data-text="${name}">${name}</div>
          <div class="intro-tagline">Jetzt erhältlich</div>
        </div>
        <div class="graffiti-drips"></div>`,

      chrome: `
        <div class="chrome-bg"></div>
        <div class="chrome-shine-strip"></div>
        <div class="intro-text-wrap chrome-text">
          <div class="intro-label chrome-label">EXCLUSIVE DROP</div>
          <div class="intro-name chrome-name">${name}</div>
          <div class="chrome-subtitle">Premium Collection</div>
        </div>
        <div class="chrome-edge-left"></div>
        <div class="chrome-edge-right"></div>`,

      money: `
        <div class="money-bg"></div>
        <div class="money-rain" id="moneyRain"></div>
        <div class="intro-text-wrap money-text">
          <div class="intro-label" style="color:#FFD700">DRIP VAULT DROP</div>
          <div class="intro-name money-name">${name}</div>
        </div>`,

      album: `
        <div class="album-bg"></div>
        <div class="album-record-wrap">
          <div class="album-record">
            <div class="album-label-ring"></div>
            <div class="album-label-inner">
              <span class="album-title-text">DV</span>
            </div>
          </div>
        </div>
        <div class="intro-text-wrap album-text">
          <div class="intro-name album-name">${name}</div>
          <div class="intro-label">LIMITED EDITION</div>
        </div>`,

      street: `
        <div class="street-bg"></div>
        <div class="street-lights"></div>
        <div class="intro-text-wrap street-text">
          <div class="street-top">DRIP VAULT</div>
          <div class="intro-name street-name">${name}</div>
          <div class="neon-bar" style="--neon:${ac}"></div>
        </div>`,

      glitch: `
        <div class="glitch-bg"></div>
        <div class="glitch-lines-wrap" id="glitchLines"></div>
        <div class="intro-text-wrap glitch-text">
          <div class="intro-name glitch-name" data-text="${name}">${name}</div>
          <div class="intro-label glitch-sub">DROP INCOMING</div>
        </div>`,

      spray: `
        <div class="spray-canvas-wrap" id="sprayWrap">
          <canvas id="sprayCanvas"></canvas>
        </div>
        <div class="intro-text-wrap spray-text">
          <div class="intro-name spray-name">${name}</div>
          <div class="intro-label">FRESH DROP</div>
        </div>`,
    };

    el.innerHTML = contentMap[type] || contentMap.graffiti;
    return el;
  }

  /* ── Special per-type setup ────────────────────────────────── */
  function setupSpecial(type, el, accent) {
    if (type === 'money') {
      const rain = el.querySelector('#moneyRain');
      if (!rain) return;
      for (let i = 0; i < 35; i++) {
        const s = document.createElement('span');
        s.className = 'money-sign';
        s.textContent = '$';
        s.style.cssText = `
          left:${Math.random()*100}%;
          font-size:${18+Math.random()*32}px;
          animation-delay:${Math.random()*1.8}s;
          color:${Math.random()>.5?'#4CAF50':'#FFD700'};
          opacity:${0.4+Math.random()*0.6};`;
        rain.appendChild(s);
      }
    }

    if (type === 'glitch') {
      const wrap = el.querySelector('#glitchLines');
      if (!wrap) return;
      for (let i = 0; i < 10; i++) {
        const l = document.createElement('div');
        l.className = 'glitch-scan-line';
        l.style.cssText = `
          top:${Math.random()*100}%;
          height:${1+Math.random()*5}px;
          animation-delay:${Math.random()*0.6}s;
          opacity:${0.2+Math.random()*0.7};`;
        wrap.appendChild(l);
      }
    }

    if (type === 'graffiti') {
      const drips = el.querySelector('.graffiti-drips');
      if (!drips) return;
      const colors = [accent||'#ff2d55','#ff9500','#FFD700','#5b8dee'];
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('div');
        d.className = 'graffiti-drip';
        d.style.cssText = `
          left:${5+Math.random()*90}%;
          height:${30+Math.random()*80}px;
          background:${colors[i%colors.length]};
          animation-delay:${Math.random()*1.2}s;
          width:${2+Math.random()*6}px;`;
        drips.appendChild(d);
      }
    }

    if (type === 'spray') {
      const wrap = el.querySelector('#sprayWrap');
      const canvas = el.querySelector('#sprayCanvas');
      if (!canvas || !wrap) return;
      const W = canvas.width  = window.innerWidth;
      const H = canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      const colors = [accent||'#ff2d55','#0f0f0f','#1a1a1a','#FFD700'];
      let frame = 0;
      const maxFrames = 80;
      const sprays = Array.from({length:5}, (_, i) => ({
        x: Math.random()*W,
        y: Math.random()*H,
        color: colors[i%colors.length],
        r: 0,
        maxR: 150+Math.random()*200,
        delay: i * 12,
      }));
      function drawFrame() {
        if (frame > maxFrames) return;
        frame++;
        sprays.forEach(s => {
          if (frame < s.delay) return;
          s.r = Math.min(s.maxR, s.r + (s.maxR / 30));
          if (s.r <= 0) return;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          g.addColorStop(0,   s.color + 'cc');
          g.addColorStop(0.6, s.color + '66');
          g.addColorStop(1,   'transparent');
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
          ctx.fillStyle = g;
          ctx.fill();
        });
        requestAnimationFrame(drawFrame);
      }
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0,0,W,H);
      setTimeout(drawFrame, 100);
    }
  }

  /* ── Main play function ────────────────────────────────────── */
  function playIntro(type, collectionName, accent, callback) {
    const intro = INTROS[type];
    if (!intro || type === 'none') { callback?.(); return; }

    const overlay = buildOverlay(type, collectionName || 'NEW DROP', accent);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    /* type-specific setup after DOM insert */
    requestAnimationFrame(() => {
      setupSpecial(type, overlay, accent);
      overlay.classList.add('intro-playing');
    });

    setTimeout(() => {
      overlay.classList.add('intro-exit');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        callback?.();
      }, 650);
    }, intro.dur);
  }

  /* ── Countdown helper ──────────────────────────────────────── */
  function startCountdown(dateStr, ids) {
    const { days, hours, mins, secs } = ids;
    function tick() {
      const now  = Date.now();
      const then = new Date(dateStr).getTime();
      let diff   = Math.max(0, then - now);
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
      const m = Math.floor(diff / 60000);    diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      const pad = n => String(n).padStart(2,'0');
      if (days)  document.getElementById(days).textContent  = pad(d);
      if (hours) document.getElementById(hours).textContent = pad(h);
      if (mins)  document.getElementById(mins).textContent  = pad(m);
      if (secs)  document.getElementById(secs).textContent  = pad(s);
    }
    tick();
    return setInterval(tick, 1000);
  }

  return { playIntro, startCountdown, INTROS };
})();
