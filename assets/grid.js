// Horizon grid, after the 1990 Bandai "Emotion" ident: a glowing horizon on black,
// scanlines racing toward it on a floor and a mirrored ceiling, faint radials
// fanning from the vanishing point. Lines move toward the viewer with time and
// advance with scroll.
(function () {
  const cv = document.getElementById('horizon');
  const hero = document.getElementById('hero');
  if (!cv || !hero) return;
  const ctx = cv.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HY = 0.58;         // horizon height as a fraction of the stage (base of the slab)
  const CAM = 1;           // camera height above the floor (world units)
  const CELL = 0.32;       // spacing between scanlines (world units)
  const NEAR = 0.9, FAR = 60;
  const MIN_GAP = 3;       // px: drop lines that would land closer than this
  const SPEED = reduce ? 0 : 0.5;   // world units per second
  const SCROLL = 0.002;             // world units per px scrolled

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function mix(c0, c1, t) {
    return c0.map((v, i) => Math.round(v + (c1[i] - v) * t));
  }
  const FLOOR = [[255, 205, 130], [255, 70, 70]];      // at horizon -> nearest
  const CEIL = [[255, 130, 210], [190, 40, 130]];

  function hline(y, rgb, a, w) {
    ctx.lineWidth = w; ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  function draw(off) {
    ctx.clearRect(0, 0, W, H);
    const hy = H * HY, cx = W / 2;
    const f = H * 0.42;                // focal length in px

    // Haze hugging the horizon: blue above, warm below.
    let g = ctx.createLinearGradient(0, hy - H * 0.3, 0, hy);
    g.addColorStop(0, 'rgba(50,40,190,0)'); g.addColorStop(1, 'rgba(70,50,220,.18)');
    ctx.fillStyle = g; ctx.fillRect(0, hy - H * 0.3, W, H * 0.3);
    g = ctx.createLinearGradient(0, hy, 0, hy + H * 0.14);
    g.addColorStop(0, 'rgba(255,110,50,.22)'); g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H * 0.14);

    // Radials fanning from the vanishing point.
    ctx.lineWidth = 1;
    for (let i = -12; i <= 12; i++) {
      if (i === 0) continue;
      const xn = cx + f * (i * 1.3) / NEAR;
      const a = 0.12 * (1 - Math.abs(i) / 14);
      ctx.strokeStyle = `rgba(255,140,110,${a})`;
      ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(xn, hy + f * CAM / NEAR); ctx.stroke();
      ctx.strokeStyle = `rgba(220,110,255,${a * 0.7})`;
      ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(xn, hy - f * CAM / NEAR); ctx.stroke();
    }

    // Scanlines on floor and ceiling. Lines flow toward the viewer as `off` grows.
    const phase = ((off % CELL) + CELL) % CELL;
    let lastDy = -Infinity;
    for (let z = NEAR + phase; z <= FAR; z += CELL) {
      const dy = f * CAM / z;
      if (lastDy - dy < MIN_GAP && lastDy !== -Infinity) continue;   // too tight: skip
      lastDy = dy;
      const d = Math.min(1, NEAR / z);                 // 1 nearest .. 0 at horizon
      const a = 0.28 + 0.5 * Math.pow(1 - d, 1.2);
      const w = 1 + 0.8 * d;
      hline(hy + dy, mix(FLOOR[0], FLOOR[1], Math.pow(d, 0.6)), a, w);
      hline(hy - dy, mix(CEIL[0], CEIL[1], Math.pow(d, 0.6)), a * 0.75, w);
    }

    // Horizon: a hot core with a soft bloom.
    const ry = H * 0.09;
    ctx.save(); ctx.translate(cx, hy); ctx.scale(1, ry / (W * 0.6));
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.6);
    g.addColorStop(0, 'rgba(255,230,180,.85)'); g.addColorStop(0.25, 'rgba(255,140,70,.4)'); g.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.fillStyle = g; ctx.fillRect(-W * 0.6, -W * 0.6, W * 1.2, W * 1.2); ctx.restore();
    hline(hy, [255, 240, 210], 0.95, 1.5);
  }

  const t0 = performance.now();
  function frame(now) {
    const heroRange = Math.max(1, hero.offsetHeight - window.innerHeight);
    const sy = Math.min(window.scrollY, heroRange);
    draw(((now - t0) / 1000) * SPEED + sy * SCROLL);
    if (window.scrollY < heroRange + window.innerHeight) requestAnimationFrame(frame);
    else setTimeout(() => requestAnimationFrame(frame), 250);
  }
  requestAnimationFrame(frame);
})();
