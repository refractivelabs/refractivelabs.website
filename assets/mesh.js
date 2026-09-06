// Rectangular (Clements-style) mesh of 2x2 Mach-Zehnder cells acting as a lattice filter.
// N waveguides, N layers; each cell = 3 dB coupler → arms (top arm: heater phase θ + a fixed
// length imbalance ΔL, so the phase is wavelength dependent) → 3 dB coupler. Light enters at one
// input port; wavelength sweeps across the C-band with the pointer (or on its own) and the heaters
// drift slowly, so the mesh keeps re-routing power between its outputs.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('mesh');
  const fig = document.getElementById('meshFig');
  const ro = Readout(document.getElementById('readout'),
    [{ label: 'Input port' }, { label: 'Wavelength', unit: 'nm' }, { label: 'Peak port' }, { label: 'Peak power' }, { label: 'Extinction', unit: 'dB' }, { label: 'Heaters' }]);
  const lightL = getComputedStyle(document.documentElement).getPropertyValue('--glow-l').trim() || '58%';

  const N = 8, LAYERS = 8, LW = 110, X0 = 80, Y0 = 50, DY = 46;
  const yOf = (r) => Y0 + r * DY;
  const NG = 4.2, LAM_MIN = 1.530, LAM_MAX = 1.570;
  const SX0 = X0, SX1 = X0 + LAYERS * LW, SY0 = 548, SH = 96;   // spectrum box

  // deterministic pseudo-random so the mesh looks the same on every load
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const cells = [];
  for (let L = 0; L < LAYERS; L++) for (let i = L % 2; i + 1 < N; i += 2) {
    cells.push({ L, i, dL: 6 + 24 * rnd(), th0: 2 * Math.PI * rnd(), w: 0.10 + 0.22 * rnd(), ph: 2 * Math.PI * rnd(), phi0: 2 * Math.PI * rnd() });
  }
  const cellAt = {}; cells.forEach((c) => { cellAt[c.L + ':' + c.i] = c; });

  // ---- complex helpers ----
  const S2 = Math.SQRT1_2;
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const P = (a) => a[0] * a[0] + a[1] * a[1];
  function coupler(a, b) {  // 50:50 directional coupler
    return [[S2 * (a[0] + b[1]), S2 * (a[1] - b[0])], [S2 * (b[0] + a[1]), S2 * (b[1] - a[0])]];
  }

  // propagate; if `rec` is given, record powers per layer for drawing
  function propagate(inPort, lam, t, rec) {
    let E = []; for (let r = 0; r < N; r++) E.push([r === inPort ? 1 : 0, 0]);
    for (let L = 0; L < LAYERS; L++) {
      const pin = E.map(P), parm = pin.slice();
      const next = E.map((e) => e.slice());
      for (let i = L % 2; i + 1 < N; i += 2) {
        const c = cellAt[L + ':' + i];
        let [a, b] = coupler(E[i], E[i + 1]);
        parm[i] = P(a); parm[i + 1] = P(b);
        const th = c.th0 + 0.9 * Math.sin(c.w * t + c.ph) + 2 * Math.PI * NG * c.dL * (1 / lam - 1 / 1.55);
        a = mul(a, [Math.cos(th), Math.sin(th)]);
        const phi = c.phi0; b = mul(b, [Math.cos(phi), Math.sin(phi)]);
        [next[i], next[i + 1]] = coupler(a, b);
      }
      if (rec) { rec.pin.push(pin); rec.parm.push(parm); }
      E = next;
    }
    const out = E.map(P);
    if (rec) rec.out = out;
    return out;
  }

  // ---- svg helpers ----
  function el(tag, attrs, cls) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); return e; }
  const path = (d, cls) => el('path', { d }, cls);
  const sbend = (x0, y0, x1, y1) => 'M' + x0 + ' ' + y0 + ' C' + ((x0 + x1) / 2) + ' ' + y0 + ' ' + ((x0 + x1) / 2) + ' ' + y1 + ' ' + x1 + ' ' + y1;

  const segs = [];   // { el, L, r, part }  part: in|c1|arm|c2|out
  const gLight = el('g', { filter: 'url(#mglow)', 'stroke-linecap': 'round' }, 'light');
  const gWg = el('g', {}, 'wg');
  const gExtra = el('g');
  const gUi = el('g');
  const defs = el('defs'); defs.innerHTML = '<filter id="mglow" filterUnits="userSpaceOnUse" x="0" y="0" width="1060" height="560"><feGaussianBlur stdDeviation="3"/></filter>';
  svg.appendChild(defs);

  function addSeg(d, L, r, part) {
    const a = path(d); gLight.appendChild(a); segs.push({ el: a, L, r, part });
    gWg.appendChild(path(d));
  }
  const GAP = 9; // half-gap between guides inside a coupler
  for (let L = 0; L < LAYERS; L++) {
    const x = X0 + L * LW;
    for (let r = 0; r < N; r++) {
      const y = yOf(r);
      const top = cellAt[L + ':' + r], bot = cellAt[L + ':' + (r - 1)];
      if (!top && !bot) { addSeg('M' + x + ' ' + y + ' H' + (x + LW), L, r, 'in'); continue; }
      const yc = top ? (yOf(r) + yOf(r + 1)) / 2 - GAP : (yOf(r - 1) + yOf(r)) / 2 + GAP;
      addSeg('M' + x + ' ' + y + ' H' + (x + 8) + ' ' + sbend(x + 8, y, x + 24, yc).replace(/^M[^C]*/, ''), L, r, 'in');
      addSeg('M' + (x + 24) + ' ' + yc + ' H' + (x + 34), L, r, 'c1');
      addSeg(sbend(x + 34, yc, x + 50, y) + ' H' + (x + 72) + ' ' + sbend(x + 72, y, x + 88, yc).replace(/^M[^C]*/, ''), L, r, 'arm');
      addSeg('M' + (x + 88) + ' ' + yc + ' H' + (x + 98), L, r, 'c2');
      addSeg(sbend(x + 98, yc, x + LW, y), L, r, 'out');
      if (top) gExtra.appendChild(el('rect', { x: x + 54, y: y - 11, width: 18, height: 5, rx: 1.5 }, 'heater mh'));
    }
  }
  // input port markers and output bars
  const ports = [];
  for (let r = 0; r < N; r++) {
    const c = el('circle', { cx: X0 - 22, cy: yOf(r), r: 6 }, 'port'); c.dataset.port = r; gUi.appendChild(c); ports.push(c);
    gWg.appendChild(path('M' + (X0 - 16) + ' ' + yOf(r) + ' H' + X0));
  }
  const bars = [];
  for (let r = 0; r < N; r++) {
    const b = el('rect', { x: SX1 + 12, y: yOf(r) - 4, width: 0, height: 8, rx: 2 }, 'obar');
    b.setAttribute('fill', 'hsl(' + (r * 42) + ' 80% ' + lightL + ')'); gUi.appendChild(b); bars.push(b);
  }
  // spectrum
  const gSpec = el('g', {}, 'spec');
  gSpec.appendChild(el('line', { x1: SX0, y1: SY0, x2: SX1, y2: SY0 }));
  const specPaths = [];
  for (let r = 0; r < N; r++) { const p = path('', 'sline'); p.setAttribute('stroke', 'hsl(' + (r * 42) + ' 80% ' + lightL + ')'); gSpec.appendChild(p); specPaths.push(p); }
  const cursor = el('line', { x1: 0, y1: SY0 - SH, x2: 0, y2: SY0 }, 'cursor'); gSpec.appendChild(cursor);
  svg.append(gLight, gWg, gExtra, gUi, gSpec);

  // ---- state ----
  let inPort = 3, lam = 1.55, target = null, t = 0;
  ports[inPort].classList.add('on');
  ports.forEach((c) => c.addEventListener('click', () => { ports[inPort].classList.remove('on'); inPort = +c.dataset.port; ports[inPort].classList.add('on'); }));
  fig.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * 1060;
    target = Math.max(0, Math.min(1, (px - SX0) / (SX1 - SX0)));
  });
  fig.addEventListener('pointerleave', () => { target = null; });

  const NPTS = 160;
  function render() {
    const p = (lam - LAM_MIN) / (LAM_MAX - LAM_MIN);
    const col = 'hsl(' + (20 + 250 * p).toFixed(1) + ' 90% ' + lightL + ')';
    const rec = { pin: [], parm: [] };
    propagate(inPort, lam, t, rec);
    segs.forEach((s) => {
      const pin = rec.pin[s.L][s.r], parm = rec.parm[s.L][s.r];
      const pout = s.L + 1 < LAYERS ? rec.pin[s.L + 1][s.r] : rec.out[s.r];
      let v;
      switch (s.part) { case 'in': v = pin; break; case 'c1': v = (pin + parm) / 2; break; case 'arm': v = parm; break; case 'c2': v = (parm + pout) / 2; break; default: v = pout; }
      s.el.setAttribute('stroke', col);
      s.el.style.opacity = Math.min(1, v * 1.6).toFixed(3);
    });
    bars.forEach((b, r) => b.setAttribute('width', (rec.out[r] * 70).toFixed(1)));
    let hi = 0, lo = 0;
    rec.out.forEach((v, r) => { if (v > rec.out[hi]) hi = r; if (v < rec.out[lo]) lo = r; });
    ro.set(0, String(inPort + 1));
    ro.set(1, (lam * 1000).toFixed(1));
    ro.set(2, String(hi + 1));
    ro.set(3, rec.out[hi].toFixed(2));
    ro.set(4, Math.min(99.9, 10 * Math.log10(rec.out[hi] / Math.max(1e-6, rec.out[lo]))).toFixed(1));
    ro.set(5, String(cells.length));
    // spectrum
    const d = specPaths.map(() => '');
    for (let k = 0; k <= NPTS; k++) {
      const lk = LAM_MIN + (LAM_MAX - LAM_MIN) * k / NPTS;
      const out = propagate(inPort, lk, t);
      const x = (SX0 + (SX1 - SX0) * k / NPTS).toFixed(1);
      for (let r = 0; r < N; r++) d[r] += (k ? 'L' : 'M') + x + ' ' + (SY0 - SH * out[r]).toFixed(1);
    }
    specPaths.forEach((pth, r) => pth.setAttribute('d', d[r]));
    const cx = (SX0 + (SX1 - SX0) * p).toFixed(1); cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx);
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (target === null) { const p = ((t / 14) % 1); lam = LAM_MIN + (LAM_MAX - LAM_MIN) * (0.5 - 0.5 * Math.cos(2 * Math.PI * p)); }
    else { const tl = LAM_MIN + (LAM_MAX - LAM_MIN) * target; lam += (tl - lam) * Math.min(1, dt * 8); }
    render();
    requestAnimationFrame(tick);
  }
  document.getElementById('year').textContent = new Date().getFullYear();
  requestAnimationFrame(tick);
})();
