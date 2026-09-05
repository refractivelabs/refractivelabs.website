// Mach-Zehnder interferometer with a thermo-optic phase shifter on the upper arm.
// A 50/50 splitter feeds two arms; a 2x2 MMI recombines them. With phase difference Δφ,
// the two outputs carry (1 + cos Δφ)/2 and (1 − cos Δφ)/2. Heater power scales with the
// phase it produces (Δφ ∝ P, thermo-optic effect), so the heater glows brighter at larger Δφ.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fig = $('mziFig'), hint = $('mziHint');
  const light = { in: $('mIn'), up: $('mUp'), lo: $('mLo'), o1: $('mO1'), o2: $('mO2') };
  const flow = { in: $('fIn'), up: $('fUp'), lo: $('fLo'), o1: $('fO1'), o2: $('fO2') };
  const heater = $('heater'), phiLbl = $('phiLbl'), p1Lbl = $('p1Lbl'), p2Lbl = $('p2Lbl');

  const TWO_PI = 2 * Math.PI;
  let phi = 0;            // current phase difference, 0..2π
  let target = null;      // pointer-driven target, or null for the slow automatic sweep
  const lightL = getComputedStyle(document.documentElement).getPropertyValue('--glow-l').trim() || '58%';
  const col = 'hsl(200 90% ' + lightL + ')';
  Object.values(light).concat(Object.values(flow)).forEach((el) => el.setAttribute('stroke', col));

  function render() {
    const c = Math.cos(phi);
    const p1 = 0.5 * (1 + c), p2 = 0.5 * (1 - c);
    light.in.style.opacity = flow.in.style.opacity = 0.9;
    light.up.style.opacity = flow.up.style.opacity = 0.45;
    light.lo.style.opacity = flow.lo.style.opacity = 0.45;
    light.o1.style.opacity = flow.o1.style.opacity = (0.9 * p1).toFixed(3);
    light.o2.style.opacity = flow.o2.style.opacity = (0.9 * p2).toFixed(3);
    const drive = phi / TWO_PI;                       // heater power, normalised to 2π
    heater.style.opacity = (0.25 + 0.75 * drive).toFixed(3);
    phiLbl.textContent = 'Δφ = ' + (phi / Math.PI).toFixed(2) + ' π';
    p1Lbl.textContent = p1.toFixed(2);
    p2Lbl.textContent = p2.toFixed(2);
  }

  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000; last = now;
    if (target === null) {
      phi = (phi + dt * TWO_PI / 9) % TWO_PI;       // one full 2π sweep every 9 s
    } else {
      let d = target - phi;                          // ease toward the pointer
      if (d > Math.PI) d -= TWO_PI; if (d < -Math.PI) d += TWO_PI;
      phi = (phi + d * Math.min(1, dt * 8) + TWO_PI) % TWO_PI;
    }
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  fig.addEventListener('pointermove', (e) => {
    const r = fig.getBoundingClientRect();
    target = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * TWO_PI;
    if (hint) hint.style.opacity = 0;
  });
  fig.addEventListener('pointerleave', () => { target = null; });

  // Email: assembled at click time so the address never appears verbatim in the markup.
  const copy = $('copyEmail');
  if (copy) copy.addEventListener('click', () => {
    const addr = ['recruiting', 'refractivelabs.com'].join('@');
    const done = () => { copy.textContent = 'copied'; setTimeout(() => { copy.textContent = 'copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, done); else done();
  });

  $('year').textContent = new Date().getFullYear();
})();
