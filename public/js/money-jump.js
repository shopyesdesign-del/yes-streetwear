/* MON€Y JUMP – Floating-Widget + Minispiel.
   Einbinden auf der Homepage:
   <script>window.MJ_CONFIG = { shopUrl:'', score1:10000, code1:'JUMP5', label1:'5% Rabatt', score2:25000, code2:'JUMP10', label2:'10% Rabatt' };</script>
   <script src="https://DEIN-NAME.github.io/DEIN-REPO/money-jump.js" defer></script> */
(function () {
  if (window.__mjLoaded) return; window.__mjLoaded = true;
  var CFG = window.MJ_CONFIG = window.MJ_CONFIG || {};
  var cs = document.currentScript, base = (cs && cs.src) ? cs.src.replace(/[^\/]*$/, '') : '';
  if (!CFG.logo && base) CFG.logo = base + 'logo.png';   // logo.png liegt neben dieser Datei

  var CSS = `/* Logo-Button (nur mobil) */
#mj-fab { position:fixed; right:16px; bottom:calc(16px + env(safe-area-inset-bottom, 0px)); z-index:2147482000;
  width:64px; height:64px; padding:0; border-radius:50%; border:3px solid #c6ff00; background:#0e0e0e; color:#c6ff00;
  display:flex; align-items:center; justify-content:center; cursor:pointer; font:700 22px Arial, sans-serif;
  box-shadow:0 4px 14px rgba(0,0,0,.35); -webkit-tap-highlight-color:transparent; }
#mj-fab img { width:84%; height:84%; object-fit:contain; display:block; }
@media (max-width:420px) { #mj-fab { width:56px; height:56px; right:12px; } }
#mj-fab:focus-visible { outline:3px solid #fff; outline-offset:3px; }
/* Spiel-Fenster */
#mj { --black:#0e0e0e; --paper:#f2efe6; --lime:#c6ff00; --mute:#8d8a82;
  position:fixed; inset:0; z-index:2147483000; display:none; align-items:stretch; justify-content:stretch;
  padding:0; background:var(--black); color:var(--paper); font-family:'Archivo', Arial, sans-serif;
  line-height:1.3; overflow:hidden; }
#mj.open { display:flex; }
#mj *, #mj *::before, #mj *::after { box-sizing:border-box; }
#mj #mj-panel { position:relative; display:flex; align-items:stretch; justify-content:stretch;
  width:100%; height:100vh; height:100dvh; padding:0;
  border:0; background:var(--black); box-shadow:none; overflow:hidden; }
#mj #mj-close { position:absolute; z-index:2; top:max(8px, env(safe-area-inset-top, 0px)); right:max(8px, env(safe-area-inset-right, 0px)); width:44px; height:44px;
  border:3px solid var(--paper); background:var(--black); color:var(--paper); font:700 20px Arial, sans-serif;
  cursor:pointer; border-radius:0; padding:0; }
#mj #mj-close:focus-visible { outline:3px solid var(--lime); outline-offset:2px; }

#mj h1, #mj h2 { letter-spacing:normal; font-weight:400; }
#mj #mj-title-logo { display:block; width:min(74vw, 280px); height:min(32dvh, 220px); object-fit:contain; }
#mj #mj-wrap { position:relative; flex:1; width:100%; height:100%; min-width:0; min-height:0; }
#mj canvas { width:100%; height:100%; display:block; background-color:#f2efe6;
           border:4px solid var(--paper); touch-action:none; }
#mj #mj-overlay { position:absolute; inset:4px; background:rgba(14,14,14,.93); display:flex; flex-direction:column;
             align-items:center; justify-content:center; gap:10px; padding:16px; text-align:center; overflow:auto; }
#mj h1 { margin:0; font-family:'Archivo Black', Impact, sans-serif; font-size:2.4rem; line-height:.95;
       text-transform:uppercase; transform:rotate(-3deg); background:var(--lime); color:var(--black);
       padding:6px 12px; }
#mj #mj-msg { margin:0; font-size:.95rem; color:var(--mute); }
#mj input { font:inherit; font-weight:700; font-size:1.1rem; width:100%; max-width:240px; padding:10px;
          background:var(--black); color:var(--paper); border:3px solid var(--paper); text-align:center;
          border-radius:0; }
#mj input:focus-visible, #mj button:focus-visible { outline:3px solid var(--lime); outline-offset:2px; }
#mj button { font-family:'Archivo Black', Impact, sans-serif; font-size:1.1rem; text-transform:uppercase;
           padding:10px 28px; border:3px solid var(--paper); background:var(--paper); color:var(--black);
           cursor:pointer; border-radius:0; }
#mj button:hover { background:var(--lime); }
#mj ol { list-style:none; margin:4px 0 0; padding:0; width:100%; max-width:290px; font-size:.95rem; }
#mj li { display:flex; gap:8px; padding:4px 8px; border-bottom:1px dashed #444; text-align:left; }
#mj li .r { width:2.2em; color:var(--mute); }
#mj li .n { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#mj li .s { font-weight:700; }
#mj li.me { background:var(--lime); color:var(--black); border-bottom-color:var(--lime); font-weight:700; }
#mj li.me .r { color:var(--black); }
#mj li.gap { justify-content:center; color:var(--mute); border:0; padding:0; }
#mj h2 { margin:6px 0 0; font-family:'Archivo Black', Impact, sans-serif; font-size:.95rem; text-transform:uppercase; }
#mj #mj-coupon { width:100%; max-width:290px; border:3px dashed var(--lime); padding:10px; display:flex;
            flex-direction:column; gap:6px; align-items:center; }
#mj #mj-coupon small { color:var(--mute); }
#mj #mj-code { font-family:'Archivo Black', Impact, sans-serif; font-size:1.6rem; letter-spacing:.08em; color:var(--lime); }
#mj #mj-coupon .row { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
#mj #mj-coupon button, #mj #mj-coupon a { font-size:.85rem; padding:6px 12px; }
#mj #mj-coupon a { font-family:'Archivo Black', Impact, sans-serif; text-transform:uppercase; text-decoration:none;
              border:3px solid var(--lime); background:var(--lime); color:var(--black); }
#mj #mj-score-card { width:100%; max-width:300px; border:3px solid var(--lime); background:#111; padding:20px 16px 14px; display:flex; flex-direction:column; align-items:center; gap:5px; }
#mj #mj-card-logo { width:min(55vw,200px); height:auto; display:block; margin-bottom:4px; }
#mj #mj-card-label { font-family:'Archivo Black',Impact,sans-serif; font-size:1.2rem; text-transform:uppercase; transform:rotate(-2deg); background:var(--lime); color:var(--black); padding:3px 12px; }
#mj #mj-card-name { font-family:'Archivo Black',Impact,sans-serif; font-size:1.7rem; text-transform:uppercase; color:var(--paper); letter-spacing:.05em; margin-top:8px; }
#mj #mj-card-pts { font-family:'Archivo Black',Impact,sans-serif; font-size:4.5rem; line-height:1; color:var(--lime); letter-spacing:-.02em; }
#mj #mj-card-unit { font-size:.65rem; letter-spacing:.2em; color:var(--mute); text-transform:uppercase; margin-top:-2px; }
#mj #mj-card-rank { font-family:'Archivo Black',Impact,sans-serif; font-size:.95rem; border:2px solid #555; color:var(--paper); padding:3px 12px; margin-top:6px; letter-spacing:.06em; }
#mj #mj-card-rank.top3 { border-color:var(--lime); color:var(--lime); }
#mj #mj-card-brand { font-size:.68rem; color:#555; letter-spacing:.12em; padding-top:10px; margin-top:4px; border-top:1px solid #282828; width:100%; text-align:center; }
#mj .hidden { display:none !important; }`;
  var HTML = `<button id="mj-fab" type="button" aria-label="Money Jump Spiel starten" aria-haspopup="dialog" aria-controls="mj"></button>
<div id="mj" role="dialog" aria-modal="true" aria-label="Money Jump Spiel">
  <div id="mj-panel">
    <button id="mj-close" type="button" aria-label="Spiel schließen">×</button>
    <div id="mj-wrap">
      <canvas id="mj-c" width="400" height="600" tabindex="0" aria-label="Money Jump Spielbereich. Steuerung mit Pfeiltasten, A und D oder durch Tippen links und rechts.">Dein Browser unterstützt das Spiel-Canvas nicht.</canvas>
  <div id="mj-overlay">
    <img id="mj-title-logo" src="/js/money-jump-logo.png" alt="Money Jump" />
    <h1 id="mj-title" class="hidden"></h1>
    <div id="mj-score-card" class="hidden">
      <img id="mj-card-logo" src="/js/money-jump-logo.png" alt="MON€Y JUMP">
      <div id="mj-card-label"></div>
      <div id="mj-card-name"></div>
      <div id="mj-card-pts"></div>
      <div id="mj-card-unit">PUNKTE</div>
      <div id="mj-card-rank" class="hidden"></div>
      <div id="mj-card-brand">yesdesign.art</div>
    </div>
    <p id="mj-msg">Steuern mit ← → oder A / D.<br>Am Handy: links / rechts tippen.<br>Sammle Geldbündel für Powerups.</p>
    <div id="mj-coupon" class="hidden">
      <small id="mj-coupon-label">Dein Gutschein</small>
      <div id="mj-code"></div>
      <div class="row"><button id="mj-copy" type="button">Code kopieren</button>
        <a id="mj-shop" href="#" target="_blank" rel="noopener">Zum Shop</a></div>
    </div>
    <input id="mj-name" maxlength="12" placeholder="Dein Name" autocomplete="off" aria-label="Dein Name">
    <button id="mj-start">Los geht's</button>
    <h2>Top 10 Rangliste</h2>
    <ol id="mj-board"></ol>
    </div>
  </div>
</div>`;

  function mount() {
    var f = document.createElement('link'); f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;700&display=swap';
    document.head.appendChild(f);
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var box = document.createElement('div'); box.innerHTML = HTML;
    while (box.firstChild) document.body.appendChild(box.firstChild);
    run();
  }

  function run() {
  var fab = document.getElementById('mj-fab'), modal = document.getElementById('mj'), closeBtn = document.getElementById('mj-close');
  var stop = null, refreshBoard = null, resizeGame = null, inited = false, returnFocus = fab;

  // Logo auf den Button setzen
  function arrow() { fab.textContent = '\u25B6'; }
  if (CFG.logo) { var im = new Image(); im.alt = ''; im.onerror = arrow; im.src = CFG.logo; fab.appendChild(im); }
  else arrow();

  function init() {
    if (inited) return; inited = true;
    const $ = id => document.getElementById('mj-' + id);
    const cv = $('c'), ctx = cv.getContext('2d'), wrap = $('wrap');
    const BASE_W = 400, BASE_H = 600;
    let W = BASE_W, H = BASE_H;
    const overlay = $('overlay'), msg = $('msg'), title = $('title'), logo = $('title-logo'), startBtn = $('start'),
          nameIn = $('name'), board = $('board');

    /* ===== EINSTELLUNGEN: hier anpassen ===== */
    /* Spielfigur (eingebettet, keine extra Dateien nötig) */
    const SPRITES = {
      stand: 'data:image/png;base64,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',
      jump:  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFkAAACQCAYAAABj7MfTAABLKUlEQVR42u2ddZgd9fX/XzNz3dbdd+NKDAiEhOAeLBSnhRKgFJcKpUiBAgWKlCIFCkUKhGJBggQSosR1Y2tZ9+s68vn9ce/e3UBbKKWE78NveO6TPGH3zsx7zud8znmf9zkD38OjtLR0f6vN1mKz2RKyLEcURYkoihIxKUrEZDL904/ZbA4ritI6fHhpyfftfkzfR5BdmZl2VZdKASRJMksSGIaOEAJJkpAkGRAYhtjr9yQJh2FY5e/b/UjflwvJyMj4cSQS+R0I7A6Xdcx+B+ZJSFSUlTJ27Eh0TUMIA1lRUGQFAeiajkCwZOlKIpEIsgTrV3/WYei6ZrFYonl5eWfu2bNnw/+35AHr9WRWujNySi+/9KdE4yofL1mF0+kEdNqa6zF0AxApkGUMAUIIDF3H7XRSUVbKnpZW8gvLikAgAV5vzwXAhv9vyalj7ITJH2blFB45rKYKTdM560en8vY7H7J1y3pWLlv85QuXJJBAGII5p57JsUcfSWlpKbf//n5kRUaSYNPa5X2hgD93X9/b98J/uVyuzQG//1BJlmnc08qRRxxKY2Mzr7z0NGNHDSORSJCIJ4jH4sRiMeKpTyIWR00k+HDh2/z5sT/z9jvv88Ddt1KQl4MwDOw2R3ZGRsbGfX1/yj4F12Y7WDbJFxaWVB3r9mQ67A4XPznvTIZXl/PUU09xyIyDOfbYYxg5YiSyLAGCe++9l0g0yrDhw5IWLctEw2HMZgvbtm3jiMNmU1JcxKYttei6LsmybI5FI/a8vLzuUCjUyw/tsJgsN0qSJGYefqKYdeRJYsZhx4vVa9aJV199RUiyJOrr64WmqsLQDWHoulATCVFYWCiuu+46oaqqMAxDGIYhNE0XDz/8sJAkSTzzzHOivb1DHHXCXHHQ7OPE5P1nCEmShMViOYEf4mGxWG4ExIzZx4nLrrherFy5WgwfPlz89KcXiWAgIBLxuNA1TRiGIS6Zd7HIzc0VsiwLu90u8vJyxbvvvSsMQxe6rolIJCK8fX1i1OjR4meX/UysWrlazDryRDFxynQBCIuinPCD9smSJFFdWUFeTjaxaJREIoHD4UCWZQQCXdc5++xzMJlMGIZBNBpl9uzDGDtmLAhAgMViwe3xkIjHiSfieNyulIsZcIz7zjPuW5CNdBLBpRf/mNy8bGRFSSUbMH/+fB588CEQggUL3sZqtWC1WsnNzWXlypV0dXZiGAbT9t+fnp4eZFlG13WEIZAkKCwsSkYhgNVq+mGBPHfuXLvJZNpZXF51w9Tps0FKWuzv7roPvz+ALMs8+uijyLKEz+ulpaWF66+/gY0bNlJUVMS8efNYsXw548aN54E/PsBtt97K7353Oz09PUiSxNoNm/l06Uquu/JSHK4MJk2bgdXmftxms77xg0lGotGopGnaCIHA6c4gw+1i965dbFi/jgULFjBq5AiQBB5PBiefcgqKYkqm1MCaNauxWm04HHZA4oorrsRkNjN79mwsVitLly5l4Qcfsnr1WkaPHI7dZkOSJAzDKEkk1O4fXsaXoh4uv+Qi3lrwDkuWfEx11dNYJZ23brkYj96PSUr6E0mWMYTA0JNgS5KEMPTkR0BM1THchZxy33zURIynnnqc4445hpkzDuSjTz5L+qQfYlo9cN+GYaBrOhKw4e+Psnrhm6ysb8XjsqHIMiAxrTyLYflOdCOZTsuyxGe7e+kMxDCEgaYZxBN1qLHjadRyEEZyw0yeREr+t4+A3icgFxcXDzVkDN3AMAxAYvenrxEKh+nwxajKtCMkgUBgkcReZIAkgcMk4zGBhIxX1dnQEaKrrZE9rduS3yvAMJK/LxAIIX44ILe3t6fdhUjFYIYQSYs2BNW5Lh5/4g5Us40f/+RCAAqzXJTliCGUi8T2ngib2/3kZGfxznufsvDpP9K1eQlaCkwhBEIYIAQIfliWPICTSAGd5IiTn7zyYViMGBlOKy1hnVjKBwtJTmIlRNKMhSCa0AgldBw6KGYTBRl2lJrRZCfakLb3oihDfueHZslf9MlptyEMDv314+id9Sy6+3LavREu2i8fSZapybRgGDpGyo4NA46qdnNAkQ2zSeGDX56KIsv86PkNRJ55lmcWX4YsyyiKgizJ+5Rw3Hcgp5CVZBlZlpOuwxBce+01nHzyyZxw5wuEQmEMQFEU7BYFkyyh6wZCCBRFZqpqoBkCWZKwmWUsTg+XX34FGzasT3PNEgJJlvYpqbtPLTkJhEFvbx/xRAKH08Xrb7xJa1sbwx58kF/84mbmnn46HZ2dvPHGG9TW1tLc3IzNZmPtmjVceNFFzH/1Vf744INMnTqFsWPG8vTTTyNJMja7A38wSDgSTXmnH2wIJyNJEo//9XlkJA6YcThLF71HdXU1Z/7oTJYtW0ZRURFXXHEFJ8+ZQ+22bew3aT+mHzidtxcsQNc1tm7bxisvv8Ljjz/Gx4s+prKqkoQG1cPH8tcXX0uWrKR9W5vYx5ZsIEgu98qyMsaMGsaKxQspKCjk7nvu4fbf/Y7p06dz/vnnI4TA5XLx5BN/wWIx43I6ufeeeznl1FO57GeXYTIpXHvtdbz33vuUl5Zy/NFH8P5HnxBPJP24QOyzfETet5YsYRhJH5ufn8O0KZPSbuRHP/oRixcv5rnnnmP0mDE0NzdTWlZOUXERY8eOZfny5WRkZLJnTxPPP/88uTm51FTXIIQgLzeHqZMnJlm8VDqe/N4fmCVLkpQu8SNS4dVAcdTQQUBubi5LliwhOzsbi8XC6XPncv7553P66adxwvHHc8aPzkBRFBKJBLNmzUpFdiKd4KS/n30bJ+8TS54yZUqsqKjoIC0eeWrT6s8QRrLUjyQxfr8D+PiTzzjnnHN49tlnuf222xBCEIvFcLlc9PT08Nhjj3PiSXPQdR1VVVm8+FPGjBnDuPHjyMgupKi0MpUVSsQiITatXY7bZf91RUXF+T8YkG+77Tajvb19ZSwWbQ0F/WnL0w0du9NFQtXo6GynqqqKi+fN49JLLkFRFF555RWcTidz5szhmquvBuDvL73E9OkHoZgUtm/fgWIyYzJZUpyyjKaqBAN+4vF4XUNDw9Yf3MY34I8Nw6C9o4PlK1djpJb7ks8+Y8+eJmqqa7j11tuIxeOccMIJVFZWsP/++zNm9GjyCwo45ZRTMJtMqdBNwmK1oigKuqEDEItG2NfHPgXZ6bRti8edm2RJmtjS2s6e5lZmzZjO9lo3fb3drP58DbpmMGLEcJ5+6mmQJDZu3JTc0FISLUmCjxctorWtg6zsXEwmM5quEQqHUdUEAV8/ZrP5NZPJtIcf6lFaWnqyOyNTzDjseDH90GOF3+8X8//xlph15BxhtzvEzy//uTB0Pf3Rh3wGqtgWq0VUDRsljp3zI6GqqvjbC6+IWUedLCbtf4gARHFxcdm+vMd9GsJlZ2f/WJKU44Vh4OvvSS7vWCzpQoSR5jOSNOhgHJbkhmWQwEhFJpqmEY3GkCWZSDRCNBrF29dNdk4e4XD4pxkZGaf8IEH2+Xy/jMVjPzWZzHS2t6AlVELBYDJ1MJJsmyzLyEpSYDhQIUESKfpSIKXYNQEEQyFUTU1mkkBH2x5KK6qJxRO/TSQSl/6gQPZ4PDUOh71n1LhJw6pHjKdy2GgcThdN9dt54qnniMdijBs7Kk1/Dsa7ezNMkpRKzVO86UUXnE0sFmPJspU07N5KRfUonK4MakaMJa+gZHJmZua7PxiQc3NzHdFoLFcxmRWLzY47I4esnHycbg8ffbqU3n4vV19+MbIsYxjJ6EMYxiAnmgJ5kCsGt8vJSccfw/sfLqKhcQ82m43M7DzMFiu5+UVYbfbceCx26A8GZJPJJAkhUBNxIuEQ4ZAfpyuD0vIabDYHu3Y3IMsyw0eMprmllQceuB+f35/00yIFLhI7d+7k1ttuo7JmJMceewyt7R0887eXkWWJiupRWG02EokYdTu30N3Zts9I++9UVlNUVHRkLBZ73evtP8swRG5fTxftLY10tDZRWFKBrCjIskxXTy+ZHg9z5pzI6tVrefyxP3HAAQcyauTINBUtDIPTTj+dV155lYsuvoSLLryAF15+jYbGPUiSjAzs2Lqe9pZG+nu7icWiGEIoFovl1ILc3NZgOLzrO6MQvouTjBkzpry1tfV3Nru9wpWRO4sU82azOYhEwljMZvr6enBnZOH2ZGGxWHG6nFx9+TxsNiu33XEvexq2E/D79uKix06cRmFhMc899SgXXnY1Pb39SBJEIyG8vd0YuoHN4SQ7twBZlkjEY3S2N9PT2bpMCNFQVVV1eW1tbej/dDJywQUX2N56662jWlpaqoLB4PmSycKoimFIspzysYJxRfmMqKlk/6n78f777/Hoo3+msLic6uFjSaga+fl5yIqCyWzHalMHmTVZxmyxYXc4yMjIIBiKEAkF2bJ+BYYwGFZdzf0PP8Sa9Zv48OMlGEJCMVspqxyBr793ht/XP8Pv9/85JyfHl2e19u5ob+/7Pwey2Wy+76WXXhqpadoJNrudkeMm4c7IRtd1JMNgxPAazjtrLiNH1JCXm8ur/3iDnY2dTJk+m672ZtasWETnqceSn5tNd2cHFpsDs9mCyZxUE5nMVtpbmpAMFSEE2zasIBAIMm7KdGRJJjc3h5KSYo49+iiOPepwWlrbeOCRJ9GFYOyk6ehanPWff7ZKGDoxq+0fxcXFr7a3t7/6f8JdWCyWkUKI82w2x2W6oWebzBYmTDk4FYoZDK+p4je/uAan00FOTg6PPPYUH3+6lHAkQiKRACSEnmy4ueLSi6iqLOe6X96C3+clEYtgMZvRDR2zxYbf109RYSErl33KYceeQjgSwWpzDIaKKWXn/Of/gqIo9PT2s/CjRanNUUZCsKt2I97+HiSkLkkynsrOzn2ho6Njx/caZLvdflIsFntr5LhJ5BWWIgwDISAzw82Tjz6Q8sVW1m/awm13/RFNU9O7viwlo4YB4v0fLz7Nb267i2Ur16AmEoSDXrZtXkNF5XDyCkqxOZ04HXbu//1tvP/hIl5fsHAvn53kO8HlcFBUVMDDf/hdUtIVj/ObW+9i+87dySIuEI+GWf/5ZzidzhODweA739sQ7vLLL89xu90uIQRWmzPZZyfJnHfW6dxzx2/xeX1s2rKNY089j5t/9wc0XUtmdZKELEuIIc/cMAwkCZqaW0AC2WTCbLEmyXdZwWS1AhLhSIymPS2MGjViL4DFkEJAOBKhvqGJ4087nwcefozu7h6uvnweF//kXGqqK5NhlpLUPttsttxhw4blfW998jPPPNOjabo0cuxkHE43iixTVVmO1WohFo/z8+tuSqbJsoRE0tIkKfk3YyBNliQcdjujhlfj8/lJqNpAbI3JZEpmgbKMYjKnc5P2zi5Ki4sYXlPFzrqGFMBDNIZisL73yZLlLFq8DFmWWPLBm5jNZsLhCJ1d3Uw+YBbbt6z9aygYfB847ntlydOmTcuxWCyvappmFJWWk1NQhCzL5GRl8pc/3cea9Ru58rqbUuAO+KgBgActbqBUVFFeyj13/JZXX3+Ljs7uL9XmBh6MSIm8nn3xVVRN46H77kDTDZxug6oRYQrLVGRFBklKauJSXySl+gB/etm1FBbkc9rJJ2AIcLg8FJVWYLbaJlitlufnzp2b/b2xZEmS7IlEYq7JbKGiZjS6kaxCDx9WTe2OXdTXN6HrGkZCw2p3ptPigdR4gBdGCMxmMzVVFexpaeX5l19PcxZDcZZTUgJDT1moJLFg4cfMPGQK5/xUxeHpRYsDikFuvom/3F9MODDIgUgpMn9XfQNt7Z1MGDcas0lB03VKyocRCYdKggH/uc3bt1//vbHkhoa6Uwd20YHKhsvh4Kc/Pofevn58/gC+vi62bljFgCZtKO8wuP9K5OZkc+M1l/PIY8lKR7rvQySZuSTjJtK/JhDkFegYyhq2Bk7Dkhlk1y5BOCZwuhLU12kcfmIXQhqiuQOCfj9IEn/56wt8smQ5l138Y4Qg1Q6RFBG09Pdr+xzkiooKW2Zm5sR4XDvNYrGmNyaEwGKxUFVVQWtbe5pJGwR08O+DGAqyMjM4bNbBrFi1hq6e3iErhSHOgZQ3H3Q7Bx/dSXunmbr6bqrGtFFZEaajOUZ2Xpy4oTJivx6Gj4/CEP9vGEZaTC4hOPSQg8jLyQYkzGYLVpsd2ZDHORyOiVOKihz7zF309/eXB4PBjdXDR1NSORwjFd+ecepJHHXEoZz9k8toa+tI+uIBK5IlhJ68WTkVOw9seKUlxVz8k3O58vqbaNrTPCDdTj+S9HMSA48p+Z21G7KYfng3i99UcOflEvMH2b0txojxLtYugV2f53D4ya2E+qrp7jCR7NGW0779kyXLQZK56caruOYXt1A9YhzVI8bSsLt2cSQSYTvqfsCmfWLJJSUllmS4lVS1C2DWjOmcdMIx6JpOa1tnyvMOuoPBTUwa4N0BiYrSEmbOOJD3P1hEb19/OsYVKUse6jqGugsJ2LPbjrfbwfm/9HLAzF4yc6xMnOohFpGYcaTKNXd08enCEsaMjaBpGn5v/5Dqi8AXCNLW3sGk/SYwa8aBaLqGIQQmk3nfhnCzZs0ytba2WgFc7owBu6K4sICykmJuveu+NLxJ5aaSrmgMGqRIRwvjxo7iR6edxDEnn0U0GhsUpQyJKJRUL540xOkIIYhHJVZ/WgAmKwfM9DF6SoRELIrDKiFbHcz/axZdzR4mT+pEwommJhhockCSkJDZVdfI7rpGsrOz0g8/MysndR1mQP3uffKqVct/2tDQsBYJPFnZyJLMlT+7CI/HzexjT+WTJcvS+5kExGPRlNl+cc0nb7SyoowVq1YTiydSNz64IYohScbQCok05AFIMnz+cRbbt7vJyBPkF5lwZgk6WyUatzkozPfx+ou5hINe6nZuTq8OKbUc/IEgj/z5L5x75umccNzRyezV6UYxmVBVdaPT6bzmO7dkq9VqisfDqZuWqCwvZfbMGXz0yRJ0QyDtZW9g6BpqIoEaj2Gy2gbTXkCWZc6aezLPvvAKhjBSou2kBYh/ksXJsjykLDXUrA0+eCkbR+QwNm37jL4uBwGflF49kmSgaxq6ru39lESynWJ3QxN33/cwd976a8qKC3ni6ecorxhGQ932/4rw/48tecyYMeVWq3WF05V1XdXw0UydfhiyojBx/Fhyc3NYu35Tqv4mpa0USUY3DFRVpa+36wslJINpkyewfOUaFrz/UVoPNySs2OvnB/aAgU1vqJZOCIEkBH2dJu74xV9x2QtTvlxGkeW9NMrxWHSvByeEQTQWY/X6Tfj8Aaw2KwLILyqjatho3J6Mq50Ox4rvBORoNGqLx+PTZbO1srisBrPNhgTk5+diaBq1O3YlN7WUoWiqhhqPo2va4NJOu4Okxf/q+ivxB4J0dvftBabYOzcesmmKdEAn0pHGQGEV4vE4leXlWCzWpAhxwK3IySo2AnRNRVe1dFg3yHtIvPH2eyiKCZCRTWZKK4dhNlvLdcOY/p2AbLVaAXA4XUkplICP3pmPy+lkzpk/JhAMDfGbgnAoQDgUQNNUJEniiNkzOfv0kweHNEkpudYQwxWCtNZC+heEoTAEwjCS6bIx2OSTfJDykAcpp73JoYdM5/DZM9LuS1MTGJqGLJFeeZIEu+rq8Xr7+dm8Czj+mMMxdAOzxYqmaYn/OchjxtQMq6ur+1xKlY4kJK6/8lJaWtp4+/0P6ev3DQnWJDRNA2EgpcpNQggqSos5fPbMZLw86BTRdS2ttRgAdCjf8GWnMSjTSu5dSYCS2XkSfE3TBpEXgprqSsaNHQ0kNRmJeAw1EU+dZ3ATXbdxK399/lUkSWLuKSehGwZ2hxNd0yxOhyN01lln5f7PQNZ1k6LreqYsy2Rm5+J2uRg7ZiQ9fX3s3FU/yKilwBmwRjEkbGtqbiEUCjFh7Oi0L1306WeUFRczfuyoL7hikRYl7sVfiC9S4oMZpdPhYP+pk1i0ZCmRlBoJJGYePB271cLa9cm5T1abHSFSXatDqdEhDmnzlloK8vOoqizD6c4ASSISjToPPfTQyP8E5LKyshltbS2PA5RVDkOSZCaMH0NNVSUP//mpQT5iwAqFIJGIpzeogc3ww48/pbGpmXk/OTfpImSZPz35HLqhM33/KQhjyLw3Sf6Sixj0HClwEUgYaTfjdrs449STePKvL+D1etOAHXv0YdhsNhZ/thwkyM7JS7aspfYKsRfZn7zWpStXo2kah82agcudQVlFUsl/1VVXvTZixIhR3zrIsVisKBSKHCqEwOZI+uNLLjqPuKoSjSXBNAZTOCSk9Cy3/t4OwkH/25Ik+QwjmWmZTCasFkvK6g38gSBZmRnMmD4Nt8uV8suDYV4S4MHkZQC8wS0WqivLOXD/KYTC4WQGKpL+2WKxJC12kPxDGOpnfm9fCliDofNHhs70276rjrmnzgEk7A7XABbHWmQ561sHeeAiTSYzWTn55GRlkZuTw2fLVtHd05vyh4Nps65rGHpyY/T29xKLxXolCR3gkcef4ZXX3mLRO6+CSLY/3nrX/eyqb+T3t99EaUkhujGocRtg3tLgGmKA8h/kiCWJWQcfwDU/v5h5V9xId3dv2tpfeuZRuru7uf/hx9KcRSIRqwv4+1ETSb8sSdIQoEW6/e2lV17D43ZRUV6KJzMHs8UCQGdvb+xbB1lV1SMlSSIzOxeQmDBuDB63i48//SzV/JLkFhR5MMQd4BvisWjUbrUmBiayGIZI8gNDNjoBvLvwY44/9Rxu/fV1LPvoDZa8/xqV5SVkZGSQlZmJx520JIfdRlZmBtnZWZQUF/HZh2+w9KM3KS8v5dhTzqGjq3sv3woSsmJKJ5ypUZThUNAf7+vtJhGLJWuRA9fNYIy/cXMtgWCIGQftj2Iy4fFkIUkSmqadfcstt3ytZO5r/dDUqVPL1q1bd7EQgtLyGiTg1DnHEQ6H2bB5214blSTL6Ik40VAINR6lr6eDTJfr+D6//1OTyTRXpJznAPE+2JwDmqYRVDUef+pvuFxODCF4+tEHsNlsCGDjhvVMnfY+5511OtffcAPCMJAkiTvu+SMmxURbRweRSGqzkwabf4b6WVL/duedd/3y9ddff3fx4s8WZmRkopjM2JzOQQJ1QOxoCD5ctJjzzjqDF17+B2WVw/D29+D3+6/3BAK/BbT/CuTq6upx7e3tdzbtafYMHz0RIQQOl4f8/FxGDK/ho0WLiUYiybba1PNX43EioQCaphGLhujr7aK4uHgzfv8XMtnBstNeDlGCT5euHOQ9JDCbzEiSRHtbMwDLV63B9Kcn0FQNAXywaMmXImkxkKkMkFICdN1IJyPt7e3EYrFt8XiUnu6krsNkNiPJCorJlF6dSDLvvL+I004+gQP3n8rKz9dSVpWcU3fvy/OfVBTFdMwxx/zs3Xff9X4jkH0+3wHxePyksqpC8gpLAYmqilKqKstpaW3nH2+/x4BlCiHQNQ0tEUPTVHRVJRoO9rtcrrdLS0vV5PiFpDUVFxWSn5fD5q3b0knDwGqQBIghbWHvLvwkDX4k6EMIQe2O3XgjWrqNbCCJGOSZh7J0ULtzF9lZmYwcXsOK7jYEgo6ODlwuPexyuZ4Nhfxz1UTcaRgGJosFlztzkEoVgq7uHurrmygrKaanphokGVmSaNy99Vxd19mwYcPPv5FPnjVrlikSi5VYLBYKisvJzclixLBKbvvNjdx60w3c+JvbqavfkwbJ0DT8/b2EQ0EkIBoJEgz6W0Kh0E9Wr14dGLAuIQTHHDmbQ2fN4OfX/Sbde7dXLDzQ05eKWAaKrYOrwEAYqTRZ2nsVCCH2SlQk4NY778dms3HkYTP3svZ3313mDYVCP0EIr7evO5kUqQkC3l4iQX96HmgwFOL8eVdy6knH8dAffseB0yaRmeHB5clMrjSzefg3Arm1tbUoHo3eduSRR3PU4Ydy3ZWX8uSf7keS4Na77icUiiS3KwGxSJhtG1cRCfuT1WHA5+1F13Xv3gVX8Hg8WCxmwqHwIN0oDU08jNRwESNdNRGGAGMQ5EHN8mCtUNcNdN0Y6iuSEwKk5EPp6u6mrLSEmTOmf0lQLstyWzDgTU0rEMQiIXbv2EjA25eOYGRZ5s9PPceHixZz352/ZdqUidQMG8HwkWPp6el54Rv55O7u7qcOOmg6Dz/0IJWVFbz/4SJOnHs+mqYRjkQHNwYgFosQjYTIzs1HQiLg68ViNt1uNjk/8fl8e/nJn5x3JuPGjObn1/5qSLVucIFrms69d/yGyfuNT6l7BunSDRs2MmvWTC4870yuvOqq9EMCCUPXkRWZo046c3A1DPAXksRDf/oLl837MYfOOoRnnv7LXvfqcDiuMwzjknDQd57D6UGSIBwKoiai6RqgBCxdvpoVq9by1LMv8sj9d3LzL69lw4YNTD/44AqXy/ViKBQ652uDPGXKlIwNGzfMam3v5te33Y0syQTDYfyB4CC9mK6yJdU3TlcGTpcHYeh0dbahKPKSeDy+5IvfvauuHmdmbroiEfR50bQE06btz7FHH87JJxzDxs3bWLx0VVomMPAcGurrEELQ1NzC0hWfp9L2lDUbAovFxCfvvcbb7yzk06Ur2LyllkQ8htVuR0iwZu16BmbwFRUVpa/J6/Uud7lch3Z3tlNR7cFssZGVnUc8lkCks8nkn5puoEU0fnXznTidjqTQRjGZdE3L+48sua6u7hTDMKyujBxa2jrSG9ve7i/ZIKNrGmazjcphY9DUBOGQF01TURTrPyF2BAs/WsSWXc1IgCxL7KmvJRj0M//Fv2IIwXMvvMzHi5fT3tWdcrJGOqSKhgIALFm2gp17ulKDqwfLUCZZpru7hzGjR3HGaXM44vjT6OloIa+wBJPZzNr1m+jtbk8DNvQoLy9/rL6+4aZ4PGq32hwUllQlu6pUDcVkTpFQIs1J9/T309PXl6R5C4rpbN8zoby8vKq5ubnxa/nkWCx2u8vlISsnL1VVSLG3YkiYlAoJND3lPw2DWDSMJMQut9t9gcfjqf1n9JkkKekKqKapxGIR7vvDH2hoqOc3v72NJ//6Iq3tHf+MCUqDYxgiye5JAlki9ZEwhMFfnvs7Dz76JH39/fzyuiuorCilpWlXmps2UgLI4i9cWm1tbb/VarnY7+tdHo0EUxuaCWHoyHJSr4ckD2RZaR5bAEWllei6KPD7fH/82hufEMKRV1iSSpEHh90NADtQjUAIdF1NWbqB39tDT0/bu8Fg8G89PT2d/2r5DIRWuq6jqSpz5pxEb28Pm7duxW63p6oYyYuTh55vL+5icNbbwEYmpW6+qbmVF/7+GocdOpOS4iK62lvTsXl6wEhx8ZeuKxAIvBgO+lvCoUASWEVJuiRpb1lCulggksBbbA4KikqJJxIzvhLko446Ktvj8TwLuAoKS/8JiTuYQRmpzv14NEoiEUPXVPr7ejCbrcu/bqre1dbM/FdfJSszk1tuvZXcghLEl5jMocXUIZvkkHQ8TSKlCykSbyxYSGNTM1dd8XOqa0awp35HuqLy70YyWCwmxe/rwzAEiqIkZQFi7+1ZGpoRArohyC8qRdd1h91uv6O6ujrjX4Lc39/vDAQCF9gdLqvZaksXiARDlogY1P6azRacTmdykL+uGg6H4xOr1dr274AVQ7Rs4VCA4uIShBC0tbenOd694t703id9AXdpiEWJIRad/LlYPEEkGsXpcmG2WEnE40iSkpZ6/cuYVpZ3a6q6SVNVDIOUKsrYS7/HF6s4wsDu9GC2WO3RaPQmr9fr+ZcgR6PJoUiZOfmpyYCkqwaDy2SwpK8oMpKskIhHaW7aLUcikcO7u7tX/TuQ2/fU07BjE7Is8eAfHyChalx/wy8ZP3l6OjUfKKYmowaDvTeDwcqI+JLwcfD6ZFnh7vsepqK8jCuvvIKq4WPo6WihuXH3v11dXq//pqKionMb6rYSjQSTIvWB+xbSF5P3QemOJFNQXP7vkxGHw1HY2Nh4rqIoFJVUpDKsZERhiL1vKF2FF4JoJIzf14+qfnX5y2w22+PxGPF4FAmJ8vIKgqEQqz5fjduT9QULk1IbHOmOU75UGRF7OZKhBiDJEi1tHRiGwGK1IskK8XiMWCz6lRNc3G63Wdc04rEImqamn6DYq2wzaMpSau8oKa/BYrGQSCTmjR8/PutLICcSiapIJHJXbkEJphQhkxQEJnlWCcEXR9gl4jEi4SCyLL8zZcrUr+zEdzqdpwDkF5YkiXJZpqggj5aWPXtdfLqSkrZg8QW7/YKHllKkx1CKVZKIhIKs37AxxaYNhoIjR46ccskll0T/1XUecsghW48++ugyXVN749FIkhdP+/2BmqExKM6TSPv6wpIKIpHIb/r6+vK+BHJxcZ5ssZiDDqc7WcsKBent6hi8GSEQGOklGY+GaarbRsOuLcSj/lWrV69u/SqQLdAy4MfURIIF776fll4lK8h6Wtucrgum2TqxN8M2NE/80s8kU/Wu9j2EQ0GaGurQdD39cwUFmYEvxYdDjieffFJduHBhazjofa69pYGm3dvQ1PheK2dAgpA0QjldKPZkZH/J56dBbm7uWD5jxiGjmxt2sHPLWnq72wkGkilxJBQg4OsbrEhIEAkH6Ovpwmq1tB133AkPfq1wwmKRBtJULRFn/fp1GIaRUgTJqaKmsdfszkHZrdjLcgeSmWT5PylcGZiWKMvJkK+3p5N4PEZ3d+deIWA0mhrr8hVHfn7+7/t7u+hsb0YfcBvpkDa5ecsIVix+j51b1xINB4jHoowYUfPzgw8+uOWfZnzNzc22waddhMlspr+7DZ+3j462ZrJy8hg2aj9ikQB7GpIB/s/Ov2C/B558Mvw1FflNWVlZR/X1dNzX1tw4wWQ2cf0N1xOPRand+HlyihZ7TwYQIqmvqBk5Lu0fVVUlGg4nySRdo62lcbC2OMDqGQaamuC2229ny5YtOJxuBGJTdnb2DV1dXR1f53rHjx/vA/Wg+vrml5rqtleOHDcFkPD1d9PT2U5hSRlulwePJ5OsrFx2b99MMOCjrKxs1fz586P/FOTuvu5phmGQmZWDYkoKoQuKnGRm5eDJyCQSDhPy9xOPR0jEY/0Wi+WddTt3fu222Y6Ojgjwkcvlakqo2gS75GDd+s04XB40VU0OENH1pGXLclq/LAxBOOAdBDkWJRzoRzeSg61jkdBe6s+B/cTlyaSuvhGL1UE0EkbXtV5N0z7q7+//Wtc7f/58HVjpdrv/7PP23qsmYlhtDno62+jubMPt8aAmEkyYPB0kiUQiTsDvJRqN2r4oWhjI3cd0dra/oKr6pIzMbErKqnB7MrA5nAiRDInqd22hvaUpIUly0Gw2bYpEIod/E0WNy+V6KzOn4KSakeNTMbBAlhUikTCxaASny41iMiPLErqmYug6hqETDQfZtH4V1cPHUFxWlXZfaZ8sMbhpCwPFZAIhCIdCtDTtwtvX/Vk8Hp/1n17vNddcY3/ooYciNrsDq82O0+miZsTYZAeWEOiGAcJAjUVYv2Y5Novlw/ETJ565bNky716WrOt6garqk8YXegjEYmzbvBZJksjKyaO8cjg2u532liasVutD4XD4xq8Tsv2TdF1at26B/cSTfqYoikw45EfXtDSlqaoJYrFoOi6WGIiTjVS4mLRYNREnFPSn3tE3uNFJkEyFRTISMpnN6LpOJBxClmRsNls8Ho//x9f9wAMPxN54441RAL29vQ92+r3HlJZX43CbQQi625vp7myjv68HKRmpHWWzGXZgkE8vLCwcYzaZxIg8p/j7ORPFOxdOEb+YXSNmVucIh8UkAOFyOoWiKEZVVfGIbyohrRxeOVGWZVFWUSNGj5s0sBMJSZLEkK37S59/9f//k98rLa8SldXDEjab5dH/RjWfn59/OCBGjZkgqoeNEhaLVZhkWYwv8oh5B5SJJ08ZI8yKLMxmU1QIIaUt2e12mzs7Oxmdl4PNrJAwYP+KDKZXuNnUnsMrGzuo7Q5it9sWNja2f6M5EQ6H4/jm+ubXTCYzVrsDlyeLVStX0dvfz023/D7pb1Mk+0A/yaAYfMhmpmkoJlMqIkklSsYgDTvQxiuEwd+f+wsCOOeCeYBEJBww6zoXe1yuIwKh0Mhvch/d3d2LbDbbpp3bt0w0yRKH1eQwZ1wBxW4TInW9+xV5WN8esKUeMqacnJzDm5ubX8h32zhmVF6aowAJHYUJJW72K/WweLeXJ9Z15Ofn55/c3d395jdwFYphGLbhoyfi8mQkI5jCAoSs4MrITItW4vFYcpJAKiFJ644NgZAMFCTMFkvyQcgSZlkZVHKmNssBoYrD6SInOwvFbEEI8GRkk5mVY/Z5e79xN1NuVtaPIvF4/KL9y5lZk43HKqMLUFPje2QJrpxZyUWvbgHk5qzs7ANMiUTUHo/HC885sJqSLHty6P6AWEVJxaiyhN0qE4lEpsiyPBb4j0B2Op2/A66adtDstL7NZrUBcrKsbxipGFfCZrcnGyFFShMnBiSySQ5DU1UsViuGEJhNZhSTMmR6bdKCBxIUfyCA0+nEZrODEMQTcdyeDPp6u4pdLteu2g8/nNiarGdyxhlnRL/OvfhDgUNVVd+/NMOC02ZCF6lsU1bSRuGySJw+vpCXNrSVGYahmDTVeAgkRuY50AwdQWpMmCR4cHEDFTl2TptQCMk0OOrxeD4Phb46aisuLj6hq6trgRAQiUZAwMY1y6kZOQ6r3Ynd7uSV197g4OkHpKvMIl1qSvLJSmrpoyQTDkTy9Z1ms3kvFyLSfHK6ZJ3++823353mwr29Xexp2I1hGHIoFBpeftBBEVmWcblc7wAnfh2Qs7Nz1/b09IQBpzAMmvqi+OI6k0rdCJF6IRiC6mxbinqILzXFE4minx5QSo7TjJG6R0mG9a1BNneGsFtkDE1ja2cYWZbC7e3tH3+di0kkErrN7mD4qAkYqcRCUWSOPPwwpkzej4cefYrm1nbOrSxPTQRIdohIQhrSFcUQrXKqnpeyakkeVI8OzbMHrLiirASXy0Fbeyc9nW0EAz7sDhejx0+mpqqSk086juzsHO67714+//zz0U6n8+pwOPyVmWtXV9fTiqLc8o8t3c7qLBtLdnezvCXIBVNLmFGTk5QpCMG44gzmTijhtS3tBSZJkuRwwkAxyRh6kvVu84Z5fMUesh0W5owtYEdXkP6I2mZ3ut4MppRAX+EenjjggAP2nzfvEjKzctENPd1MU1xUQEdnF7ph0NnZRTgS5tILz+PJZ19KcbNDm9mNIb0hSQVQNBrFpShIsint1sQQyesAdbT/tMn09Xnxen1JKUJmNhP3m8yJxx3F9AOmUlVZycIPFjJhwgR0Xa9ZvXr1NRUVFTv27Nmz8CtlVybTC+2BxNlr2wIV0yuyaA8meGJlM3luC6MKPMmZ+laZXLc1aVxut/vngVjCXuCyyPluKzISH+3sZeUeL1VZdiYXO/nbhm629atrQ8Hgmf/u5HPnzrW3tbVd4cnMumD8uPEjZs48hLVrVtHd1UFHexsSgkgkwptvv0N7Vx+hSBhZkph76hw6Ojppam7dq8SDGFLtEBAOBQh4e7FYrZjNFlRNTUcTQzZYKitKueKSC/n7a2+yp7mVww49hDFjxnDWj07jiNkz+eijj7j62muo270bi8XCrJmziEWjGbt27ZyUmZnZGIlE6r5C4bpIKKbDveHEiKNH5BDXDFa3+IlqgoOrswFBY2+YbV0hdvWENTkQCBTW94Tq/r62HVkYCKHTGYxjVmR8kTjPrG5jW09spc1mfvmrnnBWVpYzEAg8MHz4yJIZMw8lEonyy1/dxC9++Wtuuuk3GIYgGouz8MNFaVfw+oKFLF+5mosvPJ9Mj2fomh9UFaXerBMNh9hTv51QwIcwDOLRwQ6mgQfhtNs4+fijCIfDfLjoMwzD4MbrruKwmdO54/ZbGD9hAr/41c3MPuxI/va3v7Fp0yYkWeLBBx8kkVDHBoP+C7+OO8zKyPiowa/WPrK8iWZvUnr7eVN/ig4WPPt5Mwu2dWlWqzU2EFTSE1YJxRLIwJUzSinPtNMSMpZs7Ilf6/F4ru/t9f7l35103rx55rK8PLskSZx0wrEcdcRsbr7jfqbNOIJpBx/BATOPZO7c0/nb318jr6B4yKxN+MODf2bZilU89vA9FBcVpt9RPRAkD3IayX/Q1ASxSJhYLJKeymWkKNKpUyZy+qkn8ctb7kJWZATwi5tuZ8rUKUw7cCaFFaOoGj6GDz9ZRu32nXzwwULeXrCA8RPGc/fdv0eSFGXFihX2gUTiX/IwXV0P57tcR2ztTVz7WUvgWpPJFD6oMgezDKGYii+uoUjSa5FIJFsBKCsvXxFV9cQr61sPOKTCQ1Orlzd3+7BYLW/EYrHbIpFIy1c92e3bt//q48WLF8ycOZN77r6bBx55gqaW1nQ98M7f/pKlK1aybMXnyVx/KHUiSaxdt5ERwyo5+4xTaWtvp62jawjpI4iFw6hqnP7eLqw2Z0pvLHA4XekY+6zTT+bqyy/mgYcfZ/O2HemV0O/z88niz3jikfvZsWsXLW2dSJKE19vPccccTTwa5ZFH/sRvb76ZnTt3jL7xxhtveuaZZ172+/3/9u3A/kgkpOv6Kl3XV5nN5mumFDkdU4odPLKsleao8nRpWdktfX19PgXA7/d3ZGdnW4QQruWN/SPWdMZi9oysueXl5U91dXV9ZVOxx+M5K5FInF1SXFz+0ksvUruznvmvL0DTNISAU048huLiQv74pyfQND0NcJKYH5RSrVi1BmEIrv75PLp6emhsbELXVCKhEFoiRn9PF+FwEE9mFmaLDYTA6U4WGWqqyrn1pht48ZXXeOX1BYNUKQNvgdDJcLs45ODpvPvBxxgCurq6KCrI5dhjj2H9+nXk5+eTnZ2DYeg0NDSqkUjkg6+bC3g8npFb23yjXt7YZe5NyFe53O43Gxsba/ci7Ts6Ot4KhUInmtzZM82ZudO6u7vf3Lx589fiiVVVPUYIcfDVV19DVVU1by54n2gs2YQ+vKaSo4+YzUN/eoJ4PD6o2BwyEzldAUHirfc+5MabbuOGqy7j8nk/xtBVIkEf9bu20tfbmXqfkylJGg1Re5539lyWLFvBm+98OChbMIx0+BeOxHjm+ZfJy83lkgvPwzB0VE3nzj88hKpqTJ0ylct+9jPC4RCXXXoZ/f39V5xwwglfOzP0er0/dWdmzjTZbIcfecwxj7a2tq75EtX5TY5X77/ffu6vfhX5zU03ce6555Kbm8u6jZvJzcnG5XIhhKC1tY2PFi1Jtj2kOIkJ48bQ1NyC1x9IJRl7te8hDIOCvFzuueNmLrz4chobdtPRtgeLxbKxqqr4zMbG9o0mi9VWUlZNbkEx55xxKgcftD+PPvEsW7fvwkBKZ36DopZkynvg1En8/GcX89GiJdjtNgzDYPJ+46mpquT555/H5w/S2NTMa6+9ipqItQeDwRL+y+Mbg5yRkZGVSMTvjUZjP501axYTxo9PvcmRtBXJsszBBx9CQoPhw6qxWi0IIRg1YjgOh51QOMzWbTtYumIVK1atpbevP12QlJCYccBUDEPlL08+TsDvJTs7+4z+/v75FoulwWS2VFUPH8sdt91MZmYGn69dz9I1b3HQ7H6qxvjp7HDRtkeieWcOTbtt6U3WZJI59aTjmXPCMSxfvpRYLM727dtR1QSGYbB7dz0nn3wq//jHfJYt+0xzuz339/f3//K/AfkbTwnIzc11tbW1nQywdOlS1q5bv5dwxGa38dvf3MTcuaez6NOlPP/ya0wYOwaHw8Yvbr6DwoI8ysvKGDdmJCcccySXXHQB/V4fz7/0Kh9+sgRDGHzw8SISsShZ2XmEg4HW/Pz8Zf39/Vit1hZJUgrMJrPD7XZy30NP0Ofr4YLrmxCqRk+vTEL1EQo58GRrTJwSYvM6V1L3rBu88/6HZGW6efyxx9iwYWMy1k7x0WaTmTlzTiQnJwtN06VEInEO8Mt9YskA999/v/3666+P5OYXMWrclKSPNASFBbmcdPzRVFVWsHrtet5Y8AGGoe+l8JEkCSGRao7UGT1iGBf9+Fz2Gz+WxUuX8eIrb7B1y1b83h5i0RA9XR17XWthYfFNOfkldzhcGShmmdnHBqma0MueDjtmrRd/bzYHzPCz9ONyRCwLWRvLgftPYdLE8QyvqSaRSBCLx9mxs47Plq7go0+XkIgnK9IbVi8jEgkjSdImIcR+/627+K9mELW2JjO03LwCDGGkez8uOPdHjB45gp9cevVeMypEmk+XBoXaKbXPrvomfvXbOygpKuSk449i9qwZbNm8laDfi5qIPiuEkAb42WRqK9fu3rEpNm7yQbYpU6P441EkoRIPWuhtzmbcRBe9/WGOm30yoypPo66ukVVr1vHoE8+mpn4ZFObn8o+Xn2P6gVOZfegMrrnh16jxOAVFpbS1NKHIki0ai7HPfHJKLO6ora1dEY/HJ4oh5IwkDbbkIgTZOfkUllaQlVOQUkkOhHCD1OQA4RMOBpP6BY+H3ds3Ew56t1VXVx/wzyIds9k8acSYyeuPPl0lqsYJhQUHHKChRbPY/4gW6tdO57OPytmwcSumVL1vIC6XJAkMnR2b16Q57KGlKUmSMJmU3aqqjdinIA8rKSmta2vbK1Epdlu5cGI2eW4LFouFta0h1rSH2N4TI7+4nPLqkSgmJd33MfRCEokEWiJOPBZF1xK0t9T3hsPhvH9Dp+YEQ+GlRaUVow88TGC2q+TkWsgqiFO3JZOt67MRenL1DNCmEqAbOuGAj907NiNpKscNz2B2VQYNPpWn1nYSTGgDVZZWwzDK9qm7mHTQQR362rUHtLe3P6qq6kTDMMzHDfeQ5VCSlJ8sMbHEybBcK5vaw7y6tYF4NMSIcVPhnxA7iXg8OXnW0PH2dWEymf4tkd7e3t7ndDp21u/cVgYTXWarG7vDidmcqpaIpCZOIlkQEMIg4O2nbudmYtEoJ4/OZXa1J5mSyxLV2RYK3WaCfRoOh2Opy+W6vLu7e9+6iy8s3UW6ph/2u9nFVBXnYDaZwNCRZJmO/gCxRIK4KvFhQ4jVnVEKSyopKa9CVVVikUh6NoWuJtA1lfbWBt59913z7Nmzta8R6ZwpyZa/5xeVIcsKNrsNs8Wanp9hUmSaG3cTDgfo7+lm7tg8DqjwYJENbFYzWR430WicPm+AXy1qJSFouPDCC0c9+eST6reBzX/94oC5c+dafD7f/k5JO+X8cZnF+48sQTYNLhBJlgjGEsQ1g5iqkWmTWLnHh6+/B11VyczKRlXVdOZmGDp+b3enoojLHnvsiY1f5xqK8vLc3X09E5wOV4lIP3RLatCfxsa1y+nt7qDaoXHufvkUZ1hw2k0UZrmxWa0gyZjNCh6XnUlZJjb16Tv3NO35/Kprr+1ZsmSJ2OcgS5JU3NDQsPW0kZ7i4TlWMjzuoRPzkjxwLE5CNwhGdXb0Rtndl9yxQ0E/3t5uHA4XZrOJeCxC6566uKLIv+rr8z7ztVNav7/V7XZHujrb5siyLDucLqLhAI27a6nbtQ1VTZBlN3HycDduhxmTWcFuNeNx2AfnJ6ZeDKPHY9hlShfXdV6al5d3T21t7X89r/NbG1Jtt1koK84bHJeQunYDMJuSRca+qM77u317+eFwOEhHayNBXx9NDTtR1cRf+vr6Hv9Pz+/z+V4E3g8H/fR1t9PW0ojPOyjHiqiCj5oimM1mXA4HJsXEYEtlGmUKC3PwZDgRQnDggQd+K9h8e0OqZQVJUb7QwjtQPpJRUhXolP9OKLKiDxA88XiUttY9yLKE1WZTVfWbuUKbxZJQ1Xi0vy+5WQ0MpUrVHO27++OYFQWz2USGw4xuDIk6UoOzdaRkrVOSgNbvD8gmk4lATCMcjhAKx4hEE7hddvJzMtKxs2EYbOtOqtxdLsdvvV7/vf9MI/xNZFRpa43FTvtn/z5hwgTntm3bejOtig0tQdAbI9gvyM3ykOVxIYDunmQt0G63EI0nUoZS+u3Y33/7Bdu2bWsxm83zF2zvw2GRKchyk53hTDeXSymBNEgcPcxFZaYNvy9w95QRI3L4jo76+vqHDV23XTIlF13XsZkV7FZTyidDOBQhGovjsFmwmRTMZhlFUfyzXC7tewFyUhYhhwIxlQ92+FBSAmx/OJKUTw2k0rKM225iQoEdAWxr3vPr7wLg3NzcSdFo9EKLScEsD05GtNusKKbk7YejcZwOGzabFbNJ4a+rWjGbzeunXnKJ+v0B2WR6QZIk/AkdWQKrRcGsyOmxjpkOG0UZTtxWKweWOtNd/d/FYbfbywzD4Oxx2eiGgdmUfOwOmw0JiUgkhqpq2KwWZGGwaFc/CUMgy+z81rarb+NLhg0btq60tOgnn9T10eiN4bBbKcvLhuQEBRRZxmJSkrOOvXEsZvNyu93+wXcBcnd39/lmRabEbUpHOmZFwWZJ6pijsQSSJKUjoMa+EIpJWXf88Sfe8L0Ced26df7u7r4WX0Tlndpe6nsiKXpI7DXtCgwW7PSjmEzSNddcs+i7ALm0tPT3JpP5rtVtISyKgiyRBhgEToeVDLcDIXQ2tPjZ0hFCkuS2+fPnf2sv3vrWXhVXVFTkt9lsH+/s8I3zRRJFU0o8mE1KuuUrnjDY3aEjdDM7+7xlmzdvzotGo//zNz16vd4OQ4jK+v74nEOrs7CbJTwOByY5yQKaTSZkRabNG2H+5i464vJDmZmZT4dCoebvHciBQCAaDocbnE77ka2+eNnYAoc112lGkSWauhJsb0uQcJZy3vU3kFFYyLJlyybn5eR0HnnUUU3Tpk1zTJgwQd68ebP6vwDa4bA/oqpa+ZhcG/kuMx6XIz1ZC0nCJAsW13n5pMHXZ7FYburr61v+bZ7/f/I+vsxMzz1+f/DG384eRl9AoTekM+OkkznhwosoqqqkraWV8y64gF27dlFTUxNYv2G9x+lwPuP1ei/6tq9l+PDSkqamrrrpBXm2Ubl2ijyCkaVurGYZIcuomsaTy1tY0RpabrFanwwGg3/7tq/hf/Jmyays7Dxd1zN3dkaqZx8ym4vvvJsjzzyL7IKCVF+HTG5uLlOmTuXee+62PvPMX9E0bUMsFnv7274WXZdukCQOv/e++7A6PHT0Rtna4CcQSY6OfH59O1t7Ip2Syfp8MBh8lP8LR05Ozii32z29vLx8CiDefWeB2LZtq6jdtk34fD6hqarw9vcJn88rQsGAqNu9W+y///7CYrE0TJs87ZzXX3+95tu4jsrKypElJSXHmUwmcfnlPxNeb5/Q1IRIxGJiyZuvi9+ccao4aexIIUmSKCwsnMn/pcNsNi+QJEnY7fbe4cNHigMPPEgUF5cItydTvPD8C6Knu1v09/WKu+68U9x77z3i448Xibt+f69wOl3C6XSK0tLSzv/m/LNmzTJdddVVmWazeT4gMjMzxO5dO0Ug4BeGYQghhDAMQ2iqKg6ZMUO4XM7PDzzwwOz/JSamb3956uTn5XHSnONzjjzmCEwmExaTB29/P+eedw7V1dUcfdTR9PX3ccm8eXR09RJPGBx+1Bya99SzdfPaAkVRIpMnTy5bs2bNf/xKzY0b1520du3af5x55pl88MEHzJ17OplZWXup8xGCPc3N1NXXo2n6m6tWrer/X4L8rftki8Uy15ORMfqhJ86gpGYHxZVt5OSbiEZcNOxu4fzzz+Pd997lumuvZvjwkTQ1t9EfWk9fn4yaUEkkYgT8PrOmaSvC4fB/lHXdcsst8rJlyx8rKCyp+PuLL7LffhM44ogj8Hjc2O3J4Sfr163j08WfMn/+fD755BMURenMzs5QIpFo7f8K5G/9vdUmk2lpa2srXc2jaN52FO11h6DYumls3sQhMw/h3HPP4+GHH6W6ZjgbNm2hua2VuLIHRHLqa2lZFR5PBn6/7/pZs2bZ/pNzP/rooweHw5GZ48bvh67r1Awbzisvv5Lq4pfZ07yH5194nmuvvY6jjz6Khx58kMmTJ5/j9QZe+D9lyUVFRYqsGJXvLnyxqrg8i5JyCVxv8f6CFTjtBRQVldHa1onPH2T55+vJLH6H7ZvzMVQLkUiE+t3b8Hr70DS93OvtK4/HE29+jXOWx2KxS1RV/Y2u63lHHXMCWZlZ9PZ28/AjjxAMBamqqmT06DGUlpaycOG7ICWomdjL6WecRCzsUjZv2nRjRUXFOz6fr+t775N9vv6Lykdw2DMfV+LtWMPbL6qsXm5w7kXFzJxVhCGWMSHfwfJPsigo3s7q1TnEfBZiER+7tm+ie2DGhiQRCITOz8rK2OL1+u/7V+cTQkgZGRk/N1ssN0yZdgjuzGzKqkzU7tjNUYcfwpw5c3j22ed47733aWps5OlnnqazqxtNhCDjXXRqUBMJNE1zHDxsWH1jY+P/BXdheW/7hgjP3jGHzxdN4NzrPyErFwqriunrM7Fz3Uha60YRi8fY05CBFnATDQVZsfRjurvaAXBnmPnxjaWpTDL0u/Hjx1f/q/MdccQR2YFA4IaMzBzMFisut4fM/E1oAlTd4M477qS+ro5777kXSYJ3FrzDUy//mIjpEzrXXcvT95p47bX5uJ3O51/46KPw995duFyuMYpJv+v3z+SVTT3ERIH9YJraPuPEUw6mMN9CqL+UUH8msViC9xd+SjhkEAqGWb1qCcFAsquqqMLOzX8rZdJhDl57pAeP03lpc2vrJ/+GZbtNVdWDyyuH43R6knObjRAxqQ9Fy6OvLymW31XXQFPnCqqnbMLqhLHjq3BmbGfEtM9pavCyqzayUtf1d7/3G5+maVnBQPSgbRsq2bwuD3+3wUXH1NPT3YoeK6W3pQKfz8eatVuIROK0Njfx+crFhIIBJEli/yOyuOedcgJhjQevaiczM3OF2Wbb8K/Od8UVV1hVVT0DQFGUZI+IMGjakc2IcStY9PkalqxYxKJPlmAYBharg4OPd7FuRR+XnTWf2s+r+GTBWJrqrFit5vzv/cZXVFQ0Kh6Pn3HiOZkzph00gpqSkRh6mJauzcw4ZD+k+BgiQRutrZ20trXT2rKHHds34/P2oZgkDv9RDj+7p4ANS0I8fGUnLTsS72VmZt7c1dW1+l+dc8uWLU8mEonZAD1d7cQiYXLyClBkC8GAg0OP3k2oX+B21JCXm43FbCOh9tDZ1cL6lT3MOPhoKmpU7J46Al4toSdcwXA4vOV7C7Ku66dHo9G7L7phBKMnuKnf5qOts5Fr/pCP4TucYE8R8bjKrl2N+AN+VixbhN+XzAFsToXDf+Tiwxf8vPJAH0LlGYvVekd/f/+6f3W+8vLyKf39/Y8O7VIKh4L0dLXjcLpQozn4O8ZQkDsem81GVnYGhq4QCXk44pw2Rk40098XQY3LTDhMZfumzsLaDYFJuq4/9L0E+aSTTnKDccwJZ7lm5WRPpW79SO67fT49HT5OP2UOgY5RRMMawVCY1tZ2PlvyCZ0dg+V2NWGw5qMQrbt1v8Viedbpct3v9/v/bXJgGMbL8Xi8UpZlRk7Kpq8z+cKARCJOe2vylUMms5W8/HwkWcZht2E2mbDaFDIK65CkbB6+fS2xUB65+VV4cgLUrvf6Pe78xaNHj462tbXFv1cgNzc3T+jo6HzhijuKmXFsmLziNhSsPPTEPNobygh6rbS0dbJy1Xp27tjGls1rBy9AUXSn0/lnh8PxfEZG9j+83r7fR6PRr0ynCwoKlqpq4liHS8l5fGU5ecV2Nn4WQteSlZhgwEcw4EOSzaiqgdfrJysrA7PiILNkJ1kZGtGoTkKq5Zjzuykfk0BTRean73RearFYXvJ6vd3fG5DLysqK1Xj8zImTDzw02DOZntr92Nmwhnk3FONrPJGedivxWJw16zbT3d1FY/1OvN6+gddx+j0ez9OBQOCKWCy2OhQKfG1/GAgEvBMnTny6qbH1pnhQ5vSrnBx8XA7bVhn4++Lp6YuNDbsoKCzFHwxSVlqMw26nq344kd5pTJmzis0rIzx6cwbrl+RwyqV+9tRCNOB40ev1tnwvQC4pKSn1+XxXhSORm2qGjyY7p5ijjhzD2P2cWM157NlehaaqfLZ8DR0dXbS1NNDUVMuRZ+RRtyWMyWRaGg6Hz/6m5583b57Yvn376g3L+0Z9+FKw6MR5ORx1fiZOl0JHU4KwX8MwDGLRCDk5efT1+7FZLWRkenC6BfaiVVTnH8qIymMor1DJr/ETD8f45J2Oo3Rd/+M+B7m4uHhSX1/P/Zpm/GTCftOoqKrh5BOPJhY1EeqrRAtWoSYE6zbU0trWQf3u7bR3buDy3xdy4sVOtLCF2nXB8pycnMWRSOQb1dOWLFlihMPh3TabLSo0S/TT+b3j7YrE8oV++to0EvGk7CDg9+Ht76WktAIhICszE5PJgq7HyMtwsWxtjILKT1n3/v50N+t0d8RVk0nZGovF6vYZyAUFBVVer/e3ZrP11FFjxlM1bDROp50J40bisFmx2cx4vWE2bt7O2g1baG1pIK7t4KYnCzAMuOun7az40EdWVtZ1ZrP501AoFPlvbkJV1c0FBQUb/F6tfdXHfbN62hLKAMADR3JKl0R+QRGxmIrL6SHhqyHDk0VWcQfjJ4dwO6zsqashGAg4Wpqbjs3IcG6JxRJ1+wTkSZMmmRsbG5+zWu3k5BZis5k59+y5OOzJPr1ttbv5aNFyGptaaG2uZ9fOjXiydOIxiYdv7DBCXrG9qKjozMLCwgX19fW+b8Na/H6/L5GIL8/Jyan3eDx1JpPpHlmWJmuanjvAI4dDQdyeLDIzs+js7GT8uJEYhpXMLB1Plo+m2uHY5ELc7gxUVbW3NLfMzfZ4NhaXlnb29/fHv1OQ8/Ly6OjouCmRiONyZ2CzWhg9ajjd3b0seP8TanfU0d7aRN3uVRx5dpADDs/gvZf62LEuHszIyPhFOBy+IBgMNn6dvu3/9IhEIltDodDHsVhs18knn/J4S0vzxERCHZWyeLo629ENyM0rJCszA5vVhRrJIdw7Cl+vIzVd0UxZeSUNjY1KV3fH2YYReyUWU7u+U5Db29u1e++9t0TTtMmqGqevp5s333qLjxd9TCDgZ/vWDTQ27MLqMDDbZF55pBunw7HU7Xbf19fX9+fvqhRWW1srTjnl1M927tw5yWSm6syrC5Akg01rGjGZrbR3eZPvdEXGac/A5XTgdDiIRuP0e/30ef1kZefS1dl5ltvtjsZisc+/yXV8Y0mAy+X6aTwev0vTtLwvjrJVFCVssVhWms0mqyTJtdFotEKSpNfj8fhf9kXd0Wq13pNdwI13v1OERTHTvUfinp83o4WzGTl2MharnYK8bMaOGsbwYdVIssz8f7xNS2sb2zavJuD3MWHCqPGbN+/Y+p3yyaFQ6KmS7JKF/VH/CYah3qppmsNisawym82vm0ymjf39/auiUb43R1drgisObSc7z8S51xYT6NPIze9jx/bFmKQcOnPz8Pt97K5vJBz0sn3HbqLRMMGAH5vVWhuPiz3f9NzfiriluKDgxyjE2tu7XuZ7eEyYMMEJ5Le2tp6sqvERkUjsUl3XOeQEN2VVDratirN5rR+7w4HFYsXv8+31wher1frHeDx+Lf//+PqHxWIRDodju9PpvFNRlO2KooRtNttGRVES/JOZnzab7YH/j9p/eIwdO3biqFGjRqSSqiNyC3LPTMX/Zzqdzu0mkylmt9mC48aNKygpKSmtqKjI/G/O9/8APLn0O7xZ6UAAAAAASUVORK5CYII='
    };
    const HERO_H = 72;
    const IMG = {};
    for (const k in SPRITES) { IMG[k] = new Image(); IMG[k].onload = () => { if (!running) draw(); }; IMG[k].src = SPRITES[k]; }
    const backgroundImage = new Image();
    backgroundImage.crossOrigin = 'anonymous';
    backgroundImage.onload = () => { if (!running) draw(); };
    backgroundImage.src = '/money-jump-background.jpeg';
    const CFG = window.MJ_CONFIG || {};
    const SHOP_URL = CFG.shopUrl || '';
    const TIERS = [
      { score: CFG.score1 || 10000, code: CFG.code1 || 'JUMP5',  label: CFG.label1 || '5% Rabatt' },
      { score: CFG.score2 || 25000, code: CFG.code2 || 'JUMP10', label: CFG.label2 || '10% Rabatt' }
    ];
    /* ======================================== */
    const POWERUPS = {
      turbo: { name: 'TURBO',        frames: 90 },
      mega:  { name: 'MEGA-SPRUNG',  frames: 480 },
      x2:    { name: 'DOPPELTE PUNKTE', frames: 600 }
    };
    const CASH_CHANCE = 0.12;
    const GRAVITY = 0.4, JUMP = -11.5, BASE_SPEED = 5, TOP_N = 10;
    let SPEED = BASE_SPEED;
    const FRAME_INTERVAL = 1000 / 60;
    let pu = { type: null, t: 0 };
    let lastFrameTime = 0;
    let wonNow = false, toastUntil = 0, toastText = '', tier = -1;
    let p, plats, score, running = false, dir = 0, keys = {}, scores = [], playerName = '', lastScore = -1;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const SOUND_LEVEL = 0.9;
    const SOUND_PATTERNS = {
      start: [[392, 523, 0.1, 0.16, 'triangle', 0], [523, 659, 0.12, 0.15, 'triangle', 0.08]],
      bounce: [[320, 460, 0.07, 0.13, 'sine', 0]],
      powerup: [[659, 880, 0.09, 0.17, 'sine', 0], [880, 1175, 0.12, 0.15, 'triangle', 0.06]],
      reward: [[523, 659, 0.12, 0.14, 'triangle', 0], [659, 784, 0.12, 0.14, 'triangle', 0.1], [784, 1047, 0.2, 0.16, 'triangle', 0.2]],
      gameOver: [[330, 247, 0.15, 0.14, 'triangle', 0], [247, 165, 0.22, 0.15, 'sine', 0.12]]
    };
    let audioUnavailable = !AudioContextClass;
    let audioContext = null, soundOutput = null;

    function getAudioContext() {
      if (audioUnavailable) return null;
      try {
        if (!audioContext || audioContext.state === 'closed') {
          audioContext = new AudioContextClass();
          soundOutput = audioContext.createGain();
          soundOutput.gain.value = SOUND_LEVEL;
          soundOutput.connect(audioContext.destination);
        }
        return audioContext;
      } catch {
        audioUnavailable = true;
        return null;
      }
    }

    function scheduleTone(audio, startFrequency, endFrequency, duration, volume, type, delay) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      const startAt = audio.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.012, duration / 3));
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(envelope);
      envelope.connect(soundOutput);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    }

    function playSound(effect) {
      const audio = getAudioContext();
      const pattern = SOUND_PATTERNS[effect];
      if (!audio || !soundOutput || !pattern) return;
      const schedule = () => {
        if (audio !== audioContext || audio.state !== 'running') return;
        pattern.forEach(([startFrequency, endFrequency, duration, volume, type, delay]) => {
          scheduleTone(audio, startFrequency, endFrequency, duration, volume, type, delay);
        });
      };
      if (audio.state === 'running') schedule();
      else audio.resume().then(schedule).catch(() => {});
    }

    /* ---------- Gemeinsame Rangliste ---------- */
    let boardStatus = 'Rangliste wird geladen …';
    try { nameIn.value = localStorage.getItem('sj-name') || ''; } catch (e) {}
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();

    async function loadScores() {
      boardStatus = 'Rangliste wird geladen …';
      renderBoard();
      try {
        const playerName = nameIn.value.trim();
        const query = playerName ? `?name=${encodeURIComponent(playerName)}` : '';
        const response = await fetch(`/api/money-jump/scores${query}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Leaderboard request failed');
        const data = await response.json();
        scores = Array.isArray(data.scores) ? data.scores : [];
        boardStatus = '';
      } catch (e) {
        boardStatus = 'Rangliste gerade nicht erreichbar.';
      }
      renderBoard();
    }

    async function addScore(name, s) {
      boardStatus = 'Punktestand wird gespeichert …';
      renderBoard();
      try {
        const response = await fetch('/api/money-jump/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, score: s })
        });
        if (!response.ok) throw new Error('Leaderboard save failed');
        const data = await response.json();
        scores = Array.isArray(data.scores) ? data.scores : scores;
        boardStatus = '';
      } catch (e) {
        boardStatus = 'Punktestand konnte nicht gespeichert werden.';
      }
      renderBoard();
    }

    function renderBoard() {
      board.replaceChildren();
      const me = nameIn.value.trim();
      const row = (rank, e) => {
        const li = document.createElement('li');
        if (me && same(e.name, me)) li.className = 'me';
        [['r', '#' + rank], ['n', e.name], ['s', e.score]].forEach(([c, t]) => {
          const s = document.createElement('span'); s.className = c; s.textContent = t; li.appendChild(s);
        });
        board.appendChild(li);
      };
      if (!scores.length) {
        const li = document.createElement('li'); li.className = 'gap';
        li.textContent = boardStatus || 'Noch leer. Sei der Erste.';
        board.appendChild(li);
        return;
      }
      const rankedScores = scores.map((entry, index) => {
        const rank = Number(entry.rank);
        return { ...entry, rank: Number.isSafeInteger(rank) && rank > 0 ? rank : index + 1 };
      });
      rankedScores.filter(entry => entry.rank <= TOP_N).forEach(entry => row(entry.rank, entry));
      const myScore = rankedScores.find(entry => me && same(entry.name, me));
      const cardRank = document.getElementById('mj-card-rank');
      if (cardRank && lastScore >= 0 && myScore) {
        cardRank.textContent = 'PLATZ #' + myScore.rank;
        cardRank.classList.remove('hidden', 'top3');
        if (myScore.rank <= 3) cardRank.classList.add('top3');
      }
      if (myScore && myScore.rank > TOP_N) {
        const g = document.createElement('li'); g.className = 'gap'; g.textContent = '···'; board.appendChild(g);
        row(myScore.rank, myScore);
      }
      if (boardStatus) {
        const li = document.createElement('li'); li.className = 'gap';
        li.textContent = boardStatus; board.appendChild(li);
      }
    }

    refreshBoard = loadScores;

    /* ---------- Spiel ---------- */
    function makePlat(y, moving) {
      return { x: Math.random() * (W - 80), y, w: 80, h: 14,
               mv: moving ? (Math.random() < .5 ? 1 : -1) * 1.6 : 0, cash: Math.random() < CASH_CHANCE };
    }
    function reset() {
      p = { x: W / 2 - 17, y: H - 150, w: 34, h: HERO_H, vy: JUMP, face: 1, sq: 0 };
      plats = [{ x: W / 2 - 40, y: H - 40, w: 80, h: 14, mv: 0 }];
      score = 0; pu = { type: null, t: 0 };
      for (let y = H - 110; y > -H; y -= 75) plats.push(makePlat(y, false));
    }
    function update() {
      const left = keys.ArrowLeft || keys.a || keys.A || dir < 0,
            right = keys.ArrowRight || keys.d || keys.D || dir > 0;
      if (right) p.face = 1; if (left) p.face = -1;
      p.x += (right ? SPEED : 0) - (left ? SPEED : 0);
      if (p.x > W) p.x = -p.w; if (p.x < -p.w) p.x = W;
      if (pu.type === 'turbo') p.vy = -14; else p.vy += GRAVITY;
      p.y += p.vy;
      if (pu.type && --pu.t <= 0) pu.type = null;
      if (p.vy > 0) for (const pl of plats)
        if (p.x + p.w > pl.x && p.x < pl.x + pl.w && p.y + p.h > pl.y && p.y + p.h < pl.y + pl.h + p.vy + 2) { p.vy = pu.type === 'mega' ? JUMP * 1.4 : JUMP; p.sq = 9; playSound('bounce'); break; }
      for (const pl of plats) if (pl.mv) { pl.x += pl.mv; if (pl.x < 0 || pl.x + pl.w > W) pl.mv *= -1; }
      for (const pl of plats) if (pl.cash) {
        const cx = pl.x + pl.w / 2 - 14, cy = pl.y - 26;
        if (p.x + p.w > cx && p.x < cx + 28 && p.y + p.h > cy && p.y < cy + 22) {
          pl.cash = false;
          const k = ['turbo', 'mega', 'x2'][Math.floor(Math.random() * 3)];
          pu = { type: k, t: POWERUPS[k].frames };
          playSound('powerup');
        }
      }
      if (p.y < H / 2.2) { const d = H / 2.2 - p.y; p.y = H / 2.2; score += Math.round(d) * (pu.type === 'x2' ? 2 : 1); plats.forEach(pl => pl.y += d); }
      plats = plats.filter(pl => pl.y < H + 20);
      let top = Math.min(...plats.map(pl => pl.y));
      const gap = Math.min(75 + score / 120, 120);
      while (top > -20) { top -= gap; plats.push(makePlat(top, score > 600 && Math.random() < .3)); }
      while (tier + 1 < TIERS.length && score >= TIERS[tier + 1].score) {
        tier++; wonNow = true; toastText = TIERS[tier].label; toastUntil = performance.now() + 3000;
        playSound('reward');
          }
      if (p.y > H) end();
    }

    function drawPlat(pl) {
      if (pl.mv) { // Absperrband
        ctx.save(); ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
        ctx.fillStyle = '#ffd400'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = '#0e0e0e';
        for (let x = pl.x - 20; x < pl.x + pl.w + 20; x += 20) {
          ctx.beginPath(); ctx.moveTo(x, pl.y + pl.h); ctx.lineTo(x + 10, pl.y + pl.h);
          ctx.lineTo(x + 24, pl.y); ctx.lineTo(x + 14, pl.y); ctx.fill();
        }
        ctx.restore();
      } else { // Skateboard-Deck
        ctx.fillStyle = '#0e0e0e'; ctx.beginPath(); ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 7); ctx.fill();
        ctx.fillStyle = '#c6ff00'; ctx.fillRect(pl.x + 14, pl.y + 4, pl.w - 28, 6);
        ctx.fillStyle = '#0e0e0e';
        ctx.beginPath(); ctx.arc(pl.x + 16, pl.y + pl.h + 2, 3, 0, 7); ctx.arc(pl.x + pl.w - 16, pl.y + pl.h + 2, 3, 0, 7); ctx.fill();
      }
    }
    function drawCash(pl) {
      if (!pl.cash) return;
      const x = pl.x + pl.w / 2 - 14, y = pl.y - 26;
      ctx.fillStyle = '#3fae5a'; ctx.beginPath(); ctx.roundRect(x, y, 28, 20, 3); ctx.fill();
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(x + 11, y, 6, 20);
      ctx.fillStyle = '#0e0e0e'; ctx.font = '700 11px Archivo, Arial'; ctx.textAlign = 'center';
      ctx.fillText('€', x + 5.5, y + 14); ctx.fillText('€', x + 22.5, y + 14); ctx.textAlign = 'left';
    }
    function drawSneaker() {
      // Spielfigur mit kleiner Sprung-Animation: Landung = zusammenstauchen,
      // Aufstieg = Sprung-Pose mit Streckung, Fall = Stand-Pose
      const rising = p.vy < -2 || pu.type === 'turbo';
      const img = rising ? IMG.jump : IMG.stand;
      if (!img || !img.complete || !img.naturalWidth) return;
      let sx = 1, sy = 1;
      if (p.sq > 0) { const t = p.sq / 9; sx = 1 + .18 * t; sy = 1 - .2 * t; p.sq--; }
      else if (rising) { sy = 1 + Math.min(-p.vy, 12) * .006; sx = 1 / sy; }
      const dh = HERO_H, dw = dh * img.naturalWidth / img.naturalHeight;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h);             // Fußpunkt
      ctx.rotate(p.face * (rising ? .06 : -.04));          // leichte Neigung in Laufrichtung
      ctx.scale(sx, sy);
      ctx.drawImage(img, -dw / 2, -dh, dw, dh);
      ctx.restore();
    }
    function drawBackground() {
      ctx.fillStyle = '#f2efe6';
      ctx.fillRect(0, 0, W, H);
      if (!backgroundImage.complete || !backgroundImage.naturalWidth || !backgroundImage.naturalHeight) return;
      const scale = Math.max(W / backgroundImage.naturalWidth, H / backgroundImage.naturalHeight);
      const width = backgroundImage.naturalWidth * scale;
      const height = backgroundImage.naturalHeight * scale;
      ctx.drawImage(backgroundImage, (W - width) / 2, (H - height) / 2, width, height);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawBackground();
      ctx.fillStyle = 'rgba(14,14,14,.06)'; // Beton-Fugen
      for (let y = ((score * .3) % 120); y < H; y += 120) ctx.fillRect(0, y, W, 2);
      ctx.fillRect(W / 2, 0, 2, H);
      plats.forEach(drawPlat); plats.forEach(drawCash); drawSneaker();
      if (pu.type === 'turbo') { // Flamme unter dem Schuh
        ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + p.h);
        ctx.lineTo(p.x + p.w / 2, p.y + p.h + 18 + Math.random() * 10); ctx.lineTo(p.x + p.w - 6, p.y + p.h); ctx.fill();
      }
      if (pu.type) { // Anzeige oben rechts
        const info = POWERUPS[pu.type];
        ctx.textAlign = 'right'; ctx.fillStyle = '#3fae5a'; ctx.font = '14px "Archivo Black", Impact, sans-serif';
        ctx.fillText(info.name, W - 14, 28);
        ctx.fillRect(W - 14 - 110 * pu.t / info.frames, 36, 110 * pu.t / info.frames, 6); ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#0e0e0e'; ctx.font = '22px "Archivo Black", Impact, sans-serif';
      ctx.fillText(score, 14, 32);
      if (performance.now() < toastUntil) {
        ctx.fillStyle = '#c6ff00'; ctx.fillRect(0, 70, W, 44);
        ctx.fillStyle = '#0e0e0e'; ctx.font = '18px "Archivo Black", Impact, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(toastText.toUpperCase() + ' FREIGESCHALTET!', W / 2, 98); ctx.textAlign = 'left';
        ctx.fillStyle = '#0e0e0e'; ctx.font = '22px "Archivo Black", Impact, sans-serif';
      }
      ctx.font = '700 12px Archivo, Arial'; ctx.fillStyle = '#8d8a82'; ctx.fillText(playerName.toUpperCase(), 14, 50);
    }
    function resizeCanvas() {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const scale = rect.height / BASE_H;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.round(rect.width * pixelRatio);
      const height = Math.round(rect.height * pixelRatio);

      if (cv.width !== width || cv.height !== height) {
        cv.width = width;
        cv.height = height;
      }

      W = rect.width / scale;
      H = rect.height / scale;
      SPEED = BASE_SPEED * Math.max(1, W / BASE_W);
      ctx.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, 0, 0);

      if (running && p) {
        p.x = Math.max(0, Math.min(p.x, W - p.w));
        for (const platform of plats) {
          platform.x = Math.max(0, Math.min(platform.x, W - platform.w));
        }
      } else {
        reset();
      }
      draw();
    }

    function loop(timestamp = performance.now()) {
      if (!running) { lastFrameTime = 0; return; }
      if (!lastFrameTime) lastFrameTime = timestamp;
      const elapsed = timestamp - lastFrameTime;
      if (elapsed >= FRAME_INTERVAL) {
        const frames = Math.min(3, Math.floor(elapsed / FRAME_INTERVAL));
        lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);
        for (let frame = 0; frame < frames && running; frame++) update();
        if (running) draw();
      }
      requestAnimationFrame(loop);
    }

    function start() {
      playerName = nameIn.value.trim() || 'Anonym';
      nameIn.value = playerName === 'Anonym' && !nameIn.value.trim() ? '' : playerName;
      try { localStorage.setItem('sj-name', nameIn.value); } catch (e) {}
      tier = -1; showCoupon(); wonNow = false; toastUntil = 0; keys = {}; dir = 0; reset(); lastFrameTime = 0; running = true; overlay.classList.add('hidden'); playSound('start'); loop();
    }
    function end() {
      running = false; lastScore = score;
      playSound('gameOver');
      addScore(playerName, score);
      if (!nameIn.value.trim()) nameIn.value = playerName;
      logo.classList.add('hidden');
      title.classList.add('hidden');
      const sc = $('score-card'); sc.classList.remove('hidden');
      $('card-label').textContent = wonNow ? 'Geschafft' : 'Gestürzt';
      $('card-name').textContent = playerName;
      $('card-pts').textContent = score.toLocaleString('de-DE');
      $('card-rank').classList.add('hidden');
      msg.replaceChildren();
      if (tier + 1 < TIERS.length) {
        msg.append(document.createTextNode('Noch ' + (TIERS[tier + 1].score - score) + ' bis zum ' + TIERS[tier + 1].label + '-Gutschein'));
      }
      showCoupon();
      startBtn.textContent = 'Nochmal';
      renderBoard(); overlay.classList.remove('hidden'); startBtn.focus();
    }

    function showCoupon() {
      $('coupon').classList.toggle('hidden', tier < 0);
      if (tier >= 0) { $('code').textContent = TIERS[tier].code; $('coupon-label').textContent = 'Dein Gutschein: ' + TIERS[tier].label; }
      $('shop').href = SHOP_URL || '#'; $('shop').classList.toggle('hidden', !SHOP_URL);
    }
    $('copy').onclick = () => {
      const done = () => { $('copy').textContent = 'Kopiert!'; setTimeout(() => $('copy').textContent = 'Code kopieren', 2000); };
      try { navigator.clipboard.writeText(TIERS[tier].code).then(done, done); } catch (e) { done(); }
    };
    startBtn.onclick = start;
    nameIn.addEventListener('input', renderBoard);
    nameIn.addEventListener('change', loadScores);
    nameIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) start(); });
    addEventListener('keydown', e => {
      if (!running) return;
      keys[e.key] = true; if (e.key.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => keys[e.key] = false);
    function touch(e) {
      const r = cv.getBoundingClientRect(), t = e.touches[0];
      dir = (t.clientX - r.left) < r.width / 2 ? -1 : 1; e.preventDefault();
    }
    cv.addEventListener('touchstart', touch, { passive: false });
    cv.addEventListener('touchmove', touch, { passive: false });
    cv.addEventListener('touchend', () => dir = 0);

    playerName = nameIn.value;
    if (tier + 1 < TIERS.length) msg.innerHTML += '<br><b style="color:#c6ff00">' + TIERS.map(t => t.score + ' Punkte = ' + t.label).join(' · ') + '</b>';
    const MSG_START = msg.innerHTML;
    showCoupon(); reset(); draw(); renderBoard();
    resizeGame = resizeCanvas;
    window.addEventListener('resize', resizeCanvas, { passive: true });
    stop = function () { // Fenster geschlossen: zurück ins Menü, Gutschein wieder verbergen
      running = false;
      if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
      tier = -1; wonNow = false; showCoupon();
      logo.classList.remove('hidden'); title.classList.add('hidden'); title.textContent = '';
      $('score-card').classList.add('hidden');
      msg.innerHTML = MSG_START; startBtn.textContent = "Los geht's";
      renderBoard(); overlay.classList.remove('hidden');
    };
  }
  function open(event) {
    if (event && event.currentTarget) returnFocus = event.currentTarget;
    modal.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    init();
    if (resizeGame) resizeGame();
    if (refreshBoard) refreshBoard();
    closeBtn.focus();
  }
  function close() {
    if (stop) stop();
    modal.classList.remove('open'); document.documentElement.style.overflow = '';
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus(); else fab.focus();
    returnFocus = fab;
  }
  fab.addEventListener('click', open);
  document.querySelectorAll('[data-mj-open]').forEach(function (trigger) { trigger.addEventListener('click', open); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), canvas[tabindex]'))
      .filter(function (el) { return el.getClientRects().length > 0; });
    if (!focusable.length) { e.preventDefault(); return; }
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
