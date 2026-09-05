// Interactive Mach-Zehnder circuit. Five slots can be swapped between photonic primitives;
// the light is propagated through scalar transfer functions (single mode, single polarisation)
// so the outputs respond the way the real components would.
//
//   in ─[coupler]─[splitter]═[upper arm element]═[combiner]─ out 1
//                            [lower arm element]            ─ out 2
//
// A global drive d ∈ [0,1] (pointer x, or a slow automatic sweep) sets each active element:
//   heater  φ = 2π d              PN phase shifter  φ = π d, 0.5 dB loss
//   ring    round-trip phase θ = 2π d − π  (resonance at d = 0.5), all-pass response
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('mzi'), fig = $('mziFig'), menu = $('menu'), hint = $('mziHint'), readout = $('readout');
  const lightL = getComputedStyle(document.documentElement).getPropertyValue('--glow-l').trim() || '58%';
  const COL = 'hsl(200 90% ' + lightL + ')';
  const S2 = Math.SQRT1_2;

  // ---- complex helpers: [re, im] ----
  const C = (re, im) => [re, im || 0];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const scale = (a, k) => [a[0] * k, a[1] * k];
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const expi = (th) => [Math.cos(th), Math.sin(th)];
  const P = (a) => a[0] * a[0] + a[1] * a[1];
  const I = [0, 1];

  // ---- primitives ----
  // Each returns { wg: [paths], light: [{d, key}], extra: [svg elements], ... } and a transfer.
  const YU = 90, YL = 210, YM = 150;

  const couplers = {
    grating: { name: 'Grating coupler', draw: () => ({
      wg: ['M70 150 H140'], extra: [path('M70 150 L48 141 L48 159 Z', 'wg'), path('M62 147 v6 M57 145 v10 M52 143 v14', 'wg')] }) },
    edge: { name: 'Edge coupler', draw: () => ({
      wg: ['M70 150 H140'], extra: [path('M40 150 L70 146.5 M40 150 L70 153.5', 'wg'), path('M40 130 V170', 'wg dim')] }) }
  };

  const splitters = {
    y: { name: 'Y-junction', ratio: () => 0.5, draw: () => ({
      wg: ['M140 150 C200 150 220 90 300 90', 'M140 150 C200 150 220 210 300 210'],
      light: [{ d: 'M140 150 C200 150 220 90 300 90', key: 'aU' }, { d: 'M140 150 C200 150 220 210 300 210', key: 'aL' }] }),
      fn: (E) => [scale(E, S2), scale(E, S2)] },
    mmi12: { name: '1×2 MMI', draw: () => ({
      wg: ['M140 150 H175', 'M245 135 C275 135 275 90 300 90', 'M245 165 C275 165 275 210 300 210'],
      extra: [rect(175, 122, 70, 56, 'wg')],
      light: [{ d: 'M140 150 H175', key: 'in' }, { d: 'M245 135 C275 135 275 90 300 90', key: 'aU' }, { d: 'M245 165 C275 165 275 210 300 210', key: 'aL' }] }),
      fn: (E) => [scale(E, S2), scale(E, S2)] },
    dc: { name: 'Directional coupler', draw: () => ({
      wg: ['M140 150 C170 150 170 143 190 143 H250 C275 143 275 90 300 90', 'M150 210 C175 210 175 157 190 157 H250 C275 157 275 210 300 210'],
      extra: [path('M144 205 l-6 10 M138 205 l6 10', 'wg dim')],
      light: [{ d: 'M140 150 C170 150 170 143 190 143', key: 'in' }, { d: 'M190 143 H250', key: 'cU' }, { d: 'M190 157 H250', key: 'cL' },
              { d: 'M250 143 C275 143 275 90 300 90', key: 'aU' }, { d: 'M250 157 C275 157 275 210 300 210', key: 'aL' }] }),
      fn: (E) => { const th = Math.PI / 4; return [scale(E, Math.cos(th)), mul(E, [0, -Math.sin(th)])]; } }
  };

  function armElement(y, up) {
    const ry = up ? y - 32 : y + 32;   // ring centre, 8 units of gap to the bus
    return {
      straight: { name: 'Straight waveguide', draw: () => ({ wg: ['M300 ' + y + ' H500'] }), fn: (E) => E, label: () => '' },
      heater: { name: 'Thermo-optic heater', draw: () => ({
        wg: ['M300 ' + y + ' H500'],
        extra: [rect(360, up ? y - 14 : y + 6, 80, 8, 'heater', 'heater'), path('M370 ' + (up ? y - 14 : y + 14) + ' v' + (up ? -14 : 14) + ' M430 ' + (up ? y - 14 : y + 14) + ' v' + (up ? -14 : 14), 'wg')] }),
        fn: (E, d) => mul(E, expi(2 * Math.PI * d)), drive: (d) => d, label: (d) => 'φ = ' + (2 * d).toFixed(2) + 'π' },
      pn: { name: 'PN phase shifter', draw: () => ({
        wg: ['M300 ' + y + ' H500'],
        extra: [rect(360, y - 12, 80, 8, 'dope p'), rect(360, y + 4, 80, 8, 'dope n'),
                text(352, y - 5, 'p', 'lbl'), text(352, y + 11, 'n', 'lbl'),
                path('M400 ' + (y - 12) + ' v' + (up ? -16 : -16) + ' M400 ' + (y + 12) + ' v16', 'wg')] }),
        fn: (E, d) => scale(mul(E, expi(Math.PI * d)), 0.944), drive: (d) => d, label: (d) => 'φ = ' + d.toFixed(2) + 'π · 0.5 dB' },
      ring: { name: 'Ring resonator', draw: () => ({
        wg: ['M300 ' + y + ' H500'],
        extra: [circle(400, ry, 24, 'wg')],
        light: [{ d: 'M' + (400 + 24) + ' ' + ry + ' a24 24 0 1 1 -0.01 0', key: up ? 'rU' : 'rL', width: 5 }] }),
        fn: (E, d) => { const t = 0.9, a = 0.97, e = expi(2 * Math.PI * d - Math.PI);
                        return mul(E, div(sub(C(t), scale(e, a)), sub(C(1), scale(e, t * a)))); },
        build: (d) => { const t = 0.9, a = 0.97, e = expi(2 * Math.PI * d - Math.PI); return (1 - t * t) / P(sub(C(1), scale(e, t * a))); },
        drive: (d) => d, label: (d) => 'detuning ' + ((d - 0.5) * 2).toFixed(2) + ' FSR/2' }
    };
  }
  const upperElems = armElement(YU, true), lowerElems = armElement(YL, false);

  const combiners = {
    mmi22: { name: '2×2 MMI', outs: 2, draw: () => ({
      wg: ['M500 90 C540 90 540 135 580 135 H600', 'M500 210 C540 210 540 165 580 165 H600', 'M680 135 C720 135 720 120 760 120', 'M680 165 C720 165 720 180 760 180'],
      extra: [rect(600, 118, 80, 64, 'wg')],
      light: [{ d: 'M500 90 C540 90 540 135 580 135 H600', key: 'bU' }, { d: 'M500 210 C540 210 540 165 580 165 H600', key: 'bL' },
              { d: 'M680 135 C720 135 720 120 760 120', key: 'o1' }, { d: 'M680 165 C720 165 720 180 760 180', key: 'o2' }] }),
      fn: (u, l) => [scale(add(u, mul(I, l)), S2), scale(add(mul(I, u), l), S2)] },
    dc: { name: 'Directional coupler', outs: 2, draw: () => ({
      wg: ['M500 90 C540 90 540 143 580 143 H640 C680 143 680 120 760 120', 'M500 210 C540 210 540 157 580 157 H640 C680 157 680 180 760 180'],
      light: [{ d: 'M500 90 C540 90 540 143 580 143', key: 'bU' }, { d: 'M500 210 C540 210 540 157 580 157', key: 'bL' },
              { d: 'M580 143 H640', key: 'kU' }, { d: 'M580 157 H640', key: 'kL' },
              { d: 'M640 143 C680 143 680 120 760 120', key: 'o1' }, { d: 'M640 157 C680 157 680 180 760 180', key: 'o2' }] }),
      fn: (u, l) => { const th = Math.PI / 4, c = Math.cos(th), s = Math.sin(th);
                      return [add(scale(u, c), mul(l, [0, -s])), add(mul(u, [0, -s]), scale(l, c))]; } },
    y: { name: 'Y-junction', outs: 1, draw: () => ({
      wg: ['M500 90 C560 90 580 150 640 150', 'M500 210 C560 210 580 150 640 150', 'M640 150 H760'],
      light: [{ d: 'M500 90 C560 90 580 150 640 150', key: 'bU' }, { d: 'M500 210 C560 210 580 150 640 150', key: 'bL' }, { d: 'M640 150 H760', key: 'o1' }] }),
      fn: (u, l) => [scale(add(u, l), S2), C(0)] }
  };

  // ---- slots ----
  const slots = [
    { id: 'in',   title: 'Input coupler', opts: couplers,   sel: 'grating', hit: [36, 120, 100, 60] },
    { id: 'split',title: 'Splitter',      opts: splitters,  sel: 'y',       hit: [150, 80, 140, 140] },
    { id: 'up',   title: 'Upper arm',     opts: upperElems, sel: 'heater',  hit: [330, 30, 140, 90] },
    { id: 'lo',   title: 'Lower arm',     opts: lowerElems, sel: 'straight',hit: [330, 180, 140, 90] },
    { id: 'comb', title: 'Combiner',      opts: combiners,  sel: 'mmi22',   hit: [510, 80, 180, 140] }
  ];

  // ---- svg helpers ----
  function el(tag, attrs, cls) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); return e; }
  const path = (d, cls, id) => { const e = el('path', { d }, cls); if (id) e.id = id; return e; };
  const rect = (x, y, w, h, cls, id) => { const e = el('rect', { x, y, width: w, height: h, rx: 2 }, cls); if (id) e.id = id; return e; };
  const circle = (cx, cy, r, cls) => el('circle', { cx, cy, r }, cls);
  const text = (x, y, s, cls, anchor) => { const e = el('text', { x, y, 'text-anchor': anchor || 'start' }, cls); e.textContent = s; return e; };

  let lights = {};      // key -> [elements]
  let labels = {};
  function build() {
    svg.innerHTML = '';
    const defs = el('defs'); defs.innerHTML = '<filter id="glow2" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="300"><feGaussianBlur stdDeviation="3.5"/></filter>';
    svg.appendChild(defs);
    const gLight = el('g', { filter: 'url(#glow2)', 'stroke-linecap': 'round' }, 'light');
    const gFlow = el('g', {}, 'flow');
    const gWg = el('g', {}, 'wg');
    const gExtra = el('g');
    const gLbl = el('g', {}, 'lbl');
    const gHit = el('g', {}, 'hits');
    lights = {}; labels = {};
    const addLight = (d, key, w) => {
      const a = path(d, null); a.setAttribute('stroke', COL); if (w) a.setAttribute('stroke-width', w); gLight.appendChild(a);
      const f = path(d, null); f.setAttribute('stroke', COL); gFlow.appendChild(f);
      (lights[key] = lights[key] || []).push(a, f);
    };
    addLight('M70 150 H140', 'in');
    slots.forEach((s) => {
      const prim = s.opts[s.sel]; const g = prim.draw();
      (g.wg || []).forEach((d) => gWg.appendChild(path(d)));
      (g.extra || []).forEach((e) => gExtra.appendChild(e));
      (g.light || []).forEach((L) => addLight(L.d, L.key, L.width));
      if (s.id === 'up' || s.id === 'lo') {
        const y = s.id === 'up' ? YU : YL;
        // arm light before and after the element
        addLight('M300 ' + y + ' H360', s.id === 'up' ? 'aU' : 'aL');
        addLight('M440 ' + y + ' H500', s.id === 'up' ? 'bU' : 'bL');
        addLight('M360 ' + y + ' H440', s.id === 'up' ? 'bU' : 'bL');
        const t = text(400, s.id === 'up' ? 30 : 280, '', 'lbl', 'middle'); gLbl.appendChild(t); labels[s.id] = t;
      }
      const [x, y, w, h] = s.hit;
      const r = rect(x, y, w, h, 'hit'); r.dataset.slot = s.id; gHit.appendChild(r);
      const cap = text(x + w / 2, s.id === 'lo' ? 294 : (s.id === 'up' ? 16 : y - 6), prim.name, 'lbl cap', 'middle'); gLbl.appendChild(cap);
    });
    const comb = slots[4].opts[slots[4].sel];
    labels.o1 = text(768, comb.outs === 2 ? 124 : 154, '', 'lbl'); gLbl.appendChild(labels.o1);
    labels.o2 = text(768, 184, '', 'lbl'); gLbl.appendChild(labels.o2);
    svg.append(gLight, gWg, gExtra, gFlow, gLbl, gHit);
    render();
  }

  // ---- physics ----
  let drive = 0, target = null;
  function compute(d) {
    const E0 = C(1);
    const sp = slots[1].opts[slots[1].sel];
    const [aU, aL] = sp.fn(E0);
    const eU = slots[2].opts[slots[2].sel], eL = slots[3].opts[slots[3].sel];
    const bU = eU.fn(aU, d), bL = eL.fn(aL, d);
    const cb = slots[4].opts[slots[4].sel];
    const [o1, o2] = cb.fn(bU, bL);
    const p = { in: 1, aU: P(aU), aL: P(aL), bU: P(bU), bL: P(bL), o1: P(o1), o2: P(o2) };
    p.cU = (1 + p.aU) / 2; p.cL = p.aL / 2;                        // splitter DC coupling region (approximate)
    p.kU = (p.bU + p.o1) / 2; p.kL = (p.bL + p.o2) / 2;            // combiner DC coupling region
    p.rU = eU.build ? Math.min(1, eU.build(d) * p.aU / 3) : 0;    // ring circulating power, normalised
    p.rL = eL.build ? Math.min(1, eL.build(d) * p.aL / 3) : 0;
    return p;
  }

  function render() {
    const p = compute(drive);
    for (const k in lights) lights[k].forEach((e) => { e.style.opacity = (0.9 * Math.min(1, p[k] || 0)).toFixed(3); });
    const eU = slots[2].opts[slots[2].sel], eL = slots[3].opts[slots[3].sel];
    if (labels.up) labels.up.textContent = eU.label ? eU.label(drive) : '';
    if (labels.lo) labels.lo.textContent = eL.label ? eL.label(drive) : '';
    const heater = svg.querySelectorAll('.heater'); heater.forEach((h) => { h.style.opacity = (0.25 + 0.75 * drive).toFixed(3); });
    const comb = slots[4].opts[slots[4].sel];
    labels.o1.textContent = p.o1.toFixed(2);
    labels.o2.textContent = comb.outs === 2 ? p.o2.toFixed(2) : '';
    const lost = Math.max(0, 1 - p.o1 - (comb.outs === 2 ? p.o2 : 0));
    readout.textContent = slots.map((s) => s.opts[s.sel].name).join(' → ') +
      '   ·   out ' + p.o1.toFixed(2) + (comb.outs === 2 ? ' / ' + p.o2.toFixed(2) : '') +
      (lost > 0.005 ? '   ·   lost ' + lost.toFixed(2) : '');
  }

  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000; last = now;
    if (target === null) drive = (drive + dt / 9) % 1;
    else { let d = target - drive; drive = Math.max(0, Math.min(1, drive + d * Math.min(1, dt * 8))); }
    render();
    requestAnimationFrame(tick);
  }

  // ---- interaction ----
  fig.addEventListener('pointermove', (e) => {
    if (!menu.hidden) return;
    const r = svg.getBoundingClientRect();
    target = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  });
  fig.addEventListener('pointerleave', () => { target = null; });

  svg.addEventListener('click', (e) => {
    const hit = e.target.closest('.hit');
    if (!hit) { closeMenu(); return; }
    openMenu(slots.find((s) => s.id === hit.dataset.slot), hit);
    e.stopPropagation();
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  function openMenu(slot, hit) {
    menu.innerHTML = '<div class="menu-title">' + slot.title + '</div>';
    for (const k in slot.opts) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = slot.opts[k].name;
      if (k === slot.sel) b.classList.add('on');
      b.addEventListener('click', () => { slot.sel = k; build(); closeMenu(); });
      menu.appendChild(b);
    }
    const r = svg.getBoundingClientRect(), f = fig.getBoundingClientRect();
    const [x, y, w, h] = slot.hit;
    const sx = r.width / 800, sy = r.height / 300;
    menu.hidden = false;
    let left = r.left - f.left + (x + w / 2) * sx - menu.offsetWidth / 2;
    left = Math.max(0, Math.min(f.width - menu.offsetWidth, left));
    menu.style.left = left + 'px';
    menu.style.top = (r.top - f.top + (y + h) * sy + 6) + 'px';
    if (hint) hint.style.opacity = 0;
  }
  function closeMenu() { menu.hidden = true; }

  // Email: assembled at click time so the address never appears verbatim in the markup.
  const copy = $('copyEmail');
  if (copy) copy.addEventListener('click', () => {
    const addr = ['recruiting', 'refractivelabs.com'].join('@');
    const done = () => { copy.textContent = 'copied'; setTimeout(() => { copy.textContent = 'copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, done); else done();
  });
  $('year').textContent = new Date().getFullYear();

  build();
  requestAnimationFrame(tick);
})();
