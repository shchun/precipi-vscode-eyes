// Eyes — vanilla port of the "Eyes Tall" component for a VS Code webview.
// No React / no build step: it builds the DOM directly and animates with rAF.
//
// Design notes (performance):
//  - Static styles are applied once at build time. The per-frame render() only
//    rewrites the handful of properties that actually change (transforms).
//  - The rAF loop is demand-driven: it runs only while the springs are still
//    moving or the eyes are surprised, then stops. Events (mouse move, caret
//    "look", blink, surprise) call wake() to restart it.
//  - Eye centers are cached (measured on resize / size change) instead of
//    calling getBoundingClientRect() every frame, and mouse distance is divided
//    by the current stage scale so tracking stays correct when scaled down.
(function () {
  'use strict';

  const root = document.getElementById('eyes-root') || document.body;

  // ---- injected keyframes + state-driven classes ----
  const style = document.createElement('style');
  style.textContent = `
    @keyframes popMark {
      0%   { transform: translateX(-50%) translateY(10px) scale(0.3) rotate(-12deg); opacity: 0; }
      45%  { transform: translateX(-50%) translateY(-6px) scale(1.2) rotate(6deg);  opacity: 1; }
      100% { transform: translateX(-50%) translateY(0)   scale(1)   rotate(0deg);  opacity: 1; }
    }
    @keyframes sweatDrop {
      0%   { transform: translate(0, -6px) scale(0.4); opacity: 0; }
      30%  { opacity: 1; }
      100% { transform: translate(0, 40px) scale(1);   opacity: 0; }
    }
    @keyframes anxSweat {
      0%   { transform: translate(0, -4px) scale(0.5); opacity: 0; }
      18%  { opacity: 1; }
      72%  { transform: translate(0, 30px) scale(1);   opacity: 1; }
      100% { transform: translate(0, 46px) scale(1);   opacity: 0; }
    }
    .eyes-mark  { opacity: 0; }
    .eyes-sweat { opacity: 0; }
    /* Anxious is the calmer, sticky state; surprise rules come after so a click
       still overrides it. */
    .is-anxious .eyes-sweat   { animation: anxSweat 2.4s ease-in 0.2s infinite; }
    .is-surprised .eyes-mark  { opacity: 1; animation: popMark 0.35s ease both; }
    .is-surprised .eyes-sweat { animation: sweatDrop 0.85s ease-out 0.05s both; }
    @media (prefers-reduced-motion: reduce) {
      .is-anxious .eyes-sweat   { animation: none; opacity: 1; }
      .is-surprised .eyes-mark  { animation: none; }
      .is-surprised .eyes-sweat { animation: none; opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  function el(tag, parent, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function css(e, obj) { Object.assign(e.style, obj); return e; }

  // ---- build the static element tree (styles set once) ----
  const container = css(el('div', root), {
    position: 'fixed', inset: '0', background: '#efe9df',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    cursor: 'crosshair', userSelect: 'none', overflow: 'hidden',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });

  // A "stage" holds the eyes and is scaled down to fit narrow views.
  const stage = css(el('div', container), {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transformOrigin: 'center center',
  });

  const group = css(el('div', stage), {
    position: 'relative', display: 'flex', gap: '26px',
    transition: 'transform 0.4s cubic-bezier(.2,1.3,.4,1)',
  });

  const surpriseMark = css(el('div', group, 'eyes-mark'), {
    position: 'absolute', top: '-54px', left: '50%', transform: 'translateX(-50%)',
    fontSize: '44px', fontWeight: '800', color: '#e8482b', pointerEvents: 'none',
  });
  surpriseMark.textContent = '!?';

  css(el('div', group, 'eyes-sweat'), {
    position: 'absolute', top: '-2px', right: '-34px', width: '34px', height: '46px', boxSizing: 'border-box',
    background: 'radial-gradient(circle at 38% 30%, #8fcdec 0%, #2f8fd0 52%, #135f9e 100%)',
    borderRadius: '60% 60% 60% 60% / 80% 80% 40% 40%',
    border: '3.5px solid #14110f',
    boxShadow: 'inset -5px -6px 0 rgba(255,255,255,0.55), 0 3px 8px rgba(20,17,15,0.28)',
    pointerEvents: 'none', zIndex: '5',
  });

  function buildEye() {
    const wrap = css(el('div', group), { position: 'relative', flex: '0 0 auto' });
    const eye = css(el('div', wrap), {
      position: 'relative', overflow: 'hidden', borderRadius: '50%',
      background: 'radial-gradient(120% 100% at 50% 78%, #ffffff 0%, #f3f1ee 70%, #e7e2db 100%)',
      border: '8px solid #14110f',
      boxShadow: '0 14px 34px rgba(0,0,0,0.16), inset 0 10px 16px rgba(20,17,15,0.12)',
      transition: 'width 0.18s cubic-bezier(.2,1.5,.4,1), height 0.18s cubic-bezier(.2,1.5,.4,1)',
    });
    const iris = css(el('div', eye), {
      position: 'absolute', top: '50%', left: '50%', borderRadius: '50%',
      background: 'radial-gradient(circle at 42% 34%, #4a3120 0%, #311e12 40%, #1c110a 70%, #0a0603 100%)',
      boxShadow: 'inset 0 0 14px 2px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.25)',
    });
    css(el('div', iris), { // limbal ring
      position: 'absolute', inset: '0', borderRadius: '50%',
      boxShadow: 'inset 0 0 0 5px rgba(20,12,6,0.55)',
      background: 'radial-gradient(circle at 50% 50%, transparent 52%, rgba(120,78,44,0.35) 70%, transparent 86%)',
      pointerEvents: 'none',
    });
    const pupil = css(el('div', iris), {
      position: 'absolute', top: '50%', left: '50%', borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 50%, #000 60%, #160d06 100%)',
      transition: 'width 0.16s cubic-bezier(.2,1.7,.4,1), height 0.16s cubic-bezier(.2,1.7,.4,1)',
      boxShadow: '0 0 6px rgba(0,0,0,0.4)',
    });
    css(el('div', iris), { // big glint
      position: 'absolute', top: '20%', left: '24%', width: '30%', height: '30%', borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 38%, rgba(255,255,255,0.98), rgba(255,255,255,0.15) 70%, transparent)',
      pointerEvents: 'none',
    });
    css(el('div', iris), { // small glint
      position: 'absolute', bottom: '24%', right: '26%', width: '13%', height: '13%', borderRadius: '50%',
      background: 'rgba(255,255,255,0.65)', pointerEvents: 'none',
    });
    css(el('div', eye), { // sclera shade cast by the lid
      position: 'absolute', inset: '0', borderRadius: '50%', pointerEvents: 'none',
      background: 'radial-gradient(130% 70% at 50% -8%, rgba(20,15,10,0.30) 0%, rgba(20,15,10,0.10) 28%, transparent 50%)',
    });
    const lid = css(el('div', eye), {
      position: 'absolute', left: '-14%', right: '-14%', top: '0',
      background: 'linear-gradient(#efe9df 0%, #efe9df 82%, #e4ddd1 100%)',
      borderRadius: '0 0 46% 46% / 0 0 22% 22%',
      borderBottom: '4px solid #14110f',
      boxShadow: '0 5px 9px rgba(20,17,15,0.22)',
      transition: 'transform 0.13s cubic-bezier(.45,.05,.55,.95)',
      zIndex: '3',
    });
    return { wrap, eye, iris, pupil, lid, cx: 0, cy: 0 };
  }
  const L = buildEye();
  const R = buildEye();

  // ---- state ----
  const st = { surprised: false, anxious: false, tired: false, lidL: 0, lidR: 0, shake: 0 };
  let mx = -9999, my = -9999;
  let useMouse = false;              // true while the cursor is over the eyes view
  const gaze = { x: 0.6, y: 0 };     // where to look when following the editor caret
  const p = { L: { x: 0, y: 0, vx: 0, vy: 0 }, R: { x: 0, y: 0, vx: 0, vy: 0 } };
  let scaleNow = 1;                  // current stage scale (from fit)
  let blinkT = null, blinkInner = null, surpT = null;
  let running = false;

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const vscodeApi = (typeof acquireVsCodeApi !== 'undefined') ? acquireVsCodeApi() : null;

  // ---- sizing (changes only when surprised toggles) ----
  function applySize() {
    const s = st.surprised;
    const eyeW = s ? 172 : 152, eyeH = s ? 268 : 244;
    const irisSize = s ? 122 : 100, pupilSize = s ? 64 : 46;
    const lidH = eyeH + 70;
    [L, R].forEach(function (E) {
      css(E.wrap, { width: eyeW + 'px', height: eyeH + 'px' });
      css(E.eye, { width: eyeW + 'px', height: eyeH + 'px' });
      css(E.iris, {
        width: irisSize + 'px', height: irisSize + 'px',
        marginTop: (-irisSize / 2) + 'px', marginLeft: (-irisSize / 2) + 'px',
      });
      css(E.pupil, {
        width: pupilSize + 'px', height: pupilSize + 'px',
        marginTop: (-pupilSize / 2) + 'px', marginLeft: (-pupilSize / 2) + 'px',
      });
      E.lid.style.height = lidH + 'px';
    });
  }

  // ---- fit the stage into the available view (sidebar can be narrow) ----
  function fit() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    scaleNow = Math.min(1, w / 400, h / 390) || 1;
    stage.style.transform = 'scale(' + scaleNow + ')';
    measure();
    wake();
  }

  // Cache each eye's on-screen center so the loop doesn't force layout per frame.
  function measure() {
    const rl = L.eye.getBoundingClientRect();
    const rr = R.eye.getBoundingClientRect();
    if (rl.width) { L.cx = rl.left + rl.width / 2; L.cy = rl.top + rl.height / 2; }
    if (rr.width) { R.cx = rr.left + rr.width / 2; R.cy = rr.top + rr.height / 2; }
  }

  // ---- input ----
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (useMouse) { pingActive(); wake(); }
  });
  container.addEventListener('mouseenter', function () { useMouse = true; pingActive(); measure(); wake(); });
  container.addEventListener('mouseleave', function () { useMouse = false; wake(); });
  container.addEventListener('mousedown', surprise);
  window.addEventListener('resize', fit);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(container);

  // Messages from the extension host: surprise reaction + caret "look" target.
  window.addEventListener('message', function (e) {
    const d = e && e.data;
    if (!d) return;
    if (d.type === 'surprise') surprise();
    else if (d.type === 'anxious') setAnxious(!!d.on);
    else if (d.type === 'tired') setTired(!!d.on);
    else if (d.type === 'look') {
      if (Number.isFinite(d.x)) gaze.x = d.x;
      if (Number.isFinite(d.y)) gaze.y = d.y;
      wake();
    }
  });

  // Announce readiness so the extension can push the initial gaze direction.
  if (vscodeApi) vscodeApi.postMessage({ type: 'ready' });

  function surprise() {
    pingActive();                      // a click is activity → wake from tired
    clearTimeout(surpT);
    p.L.vy -= 0.32; p.R.vy -= 0.32;
    // If already surprised, restart the pop/sweat animations on the re-click.
    if (st.surprised) {
      container.classList.remove('is-surprised');
      void container.offsetWidth; // force reflow so the CSS animation replays
    }
    setSurprised(true);
    surpT = setTimeout(function () { setSurprised(false); st.shake = 0; wake(); }, 700);
  }

  function setAnxious(v) {
    if (st.anxious === v) return;
    st.anxious = v;
    container.classList.toggle('is-anxious', v);
    wake();                            // keep the loop alive for the tremble
  }

  function setTired(v) {
    if (st.tired === v) return;
    st.tired = v;
    wake();                            // run the loop for the sleepy sway / lids
  }

  // Local interaction (mouse over the eyes) the extension can't see. Wake up
  // immediately and let the host reset its idle clock — throttled so a moving
  // cursor doesn't spam messages.
  let lastActiveSent = 0;
  function pingActive() {
    if (st.tired) setTired(false);
    const now = Date.now();
    if (vscodeApi && now - lastActiveSent > 2000) {
      lastActiveSent = now;
      vscodeApi.postMessage({ type: 'active' });
    }
  }

  function setSurprised(v) {
    st.surprised = v;
    container.classList.toggle('is-surprised', v);
    group.style.transition = v ? 'transform 0.04s linear' : 'transform 0.4s cubic-bezier(.2,1.3,.4,1)';
    applySize();
    measure();   // sizes changed → centers shifted
    wake();
  }

  function scheduleBlink() {
    if (reduceMotion) return;          // honor prefers-reduced-motion: no idle blinks
    const next = 1500 + Math.random() * 2800;
    blinkT = setTimeout(function () {
      if (!st.surprised) {
        if (Math.random() < 0.13) {
          const eye = Math.random() < 0.5 ? 'lidL' : 'lidR';
          st[eye] = 1; wake();
          blinkInner = setTimeout(function () { st[eye] = 0; wake(); }, 320);
        } else {
          st.lidL = 1; st.lidR = 1; wake();
          blinkInner = setTimeout(function () { st.lidL = 0; st.lidR = 0; wake(); }, 150);
        }
      }
      scheduleBlink();
    }, next);
  }

  // Pause idle work while the view is hidden; resume cleanly when shown again.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimeout(blinkT); clearTimeout(blinkInner); blinkT = null;
    } else {
      st.lidL = 0; st.lidR = 0;       // make sure we don't resume mid-blink
      if (!blinkT) scheduleBlink();
      pingActive();                   // looking at the eyes again counts as active
      measure(); wake();
    }
  });

  // ---- animation ----
  function target(E) {
    const dx = (mx - E.cx) / scaleNow;
    const dy = (my - E.cy) / scaleNow;
    const ang = Math.atan2(dy, dx);
    const reach = Math.min(Math.hypot(dx, dy) / 6, 1);
    return { x: Math.cos(ang) * reach, y: Math.sin(ang) * reach };
  }

  function wake() {
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick() {
    const stiff = 0.16, damp = 0.72;
    const tl = useMouse ? target(L) : gaze;
    const tr = useMouse ? target(R) : gaze;
    let moving = false;
    [[p.L, tl], [p.R, tr]].forEach(function (pair) {
      const [s, t] = pair;
      s.vx = (s.vx + (t.x - s.x) * stiff) * damp;
      s.vy = (s.vy + (t.y - s.y) * stiff) * damp;
      s.x += s.vx; s.y += s.vy;
      if (Math.abs(s.vx) > 1e-4 || Math.abs(s.vy) > 1e-4 ||
          Math.abs(t.x - s.x) > 1e-4 || Math.abs(t.y - s.y) > 1e-4) moving = true;
    });
    if (st.surprised) st.shake = reduceMotion ? 0 : (Math.random() - 0.5) * 14;
    render();
    if (moving || st.surprised || ((st.anxious || st.tired) && !reduceMotion)) requestAnimationFrame(tick);
    else running = false;
  }

  // Per-frame: only the properties that actually change (transforms).
  function render() {
    const surprised = st.surprised;
    const eyeW = surprised ? 172 : 152, eyeH = surprised ? 268 : 244;
    const maxX = eyeW * (surprised ? 0.09 : 0.15);
    const maxY = eyeH * (surprised ? 0.12 : 0.22);

    group.style.transform = surprised
      ? ('translate(' + st.shake + 'px, -16px)')
      : 'translate(0, 0)';

    // Anxious: a fast, jittery shiver on the pupils (nervous darting). Bigger
    // amplitude here reads more clearly as "panicking" than a subtle quiver.
    const anx = st.anxious && !surprised && !reduceMotion;
    const tx = anx ? (Math.random() - 0.5) * 11 : 0;
    const ty = anx ? (Math.random() - 0.5) * 8 : 0;
    // Tired (idle): eyes sink and drift downward with a slow, sleepy sway.
    const tired = st.tired && !surprised && !st.anxious;
    const tiredDown = tired
      ? (maxY * 0.34 + (reduceMotion ? 0 : Math.sin(Date.now() / 620) * 3))
      : 0;
    L.iris.style.transform = 'translate(' + (p.L.x * maxX + tx) + 'px, ' + (p.L.y * maxY + ty + tiredDown) + 'px)';
    R.iris.style.transform = 'translate(' + (p.R.x * maxX + tx) + 'px, ' + (p.R.y * maxY + ty + tiredDown) + 'px)';

    const lidH = eyeH + 70, openEdge = eyeH * 0.16, closeEdge = eyeH * 0.98;
    // While anxious, hold the lids a little lowered for a worried squint; when
    // tired, drop them much further for a heavy, half-asleep look.
    const anxLid = (st.anxious && !surprised) ? 0.2 : 0;
    const tiredLid = tired ? 0.58 : 0;
    const baseLid = Math.max(anxLid, tiredLid);
    const amtL = surprised ? 0 : Math.max(st.lidL, baseLid);
    const amtR = surprised ? 0 : Math.max(st.lidR, baseLid);
    L.lid.style.transform = 'translateY(' + ((openEdge + (closeEdge - openEdge) * amtL) - lidH) + 'px)';
    R.lid.style.transform = 'translateY(' + ((openEdge + (closeEdge - openEdge) * amtR) - lidH) + 'px)';
  }

  // ---- boot ----
  applySize();
  fit();          // sets scale, measures centers, wakes the loop
  scheduleBlink();
})();
