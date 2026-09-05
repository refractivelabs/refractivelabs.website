// Scroll-driven add-drop ring resonator.
// Scroll sweeps the wavelength across 1530–1570 nm. Round-trip phase φ = 2π·n_g·L·(1/λ − 1/λ0),
// through/drop transmission from the standard add-drop ring formulas with self-coupling t,
// round-trip amplitude a. Colour is a pseudo-colour for the (invisible) C-band wavelength.
(function () {
  'use strict';
  const hero = document.getElementById('hero');
  const cue = document.getElementById('cue');
  const $ = (id) => document.getElementById(id);
  const lIn = $('lIn'), lThru = $('lThru'), lDrop = $('lDrop'), lRing = $('lRing');
  const fIn = $('fIn'), fThru = $('fThru'), fDrop = $('fDrop'), fRing = $('fRing');
  const sThru = $('sThru'), sDrop = $('sDrop'), sCursor = $('sCursor'), sLambda = $('sLambda');

  // Ring parameters (silicon, C-band).
  const R = 5.0;                    // radius, µm
  const NG = 4.2;                   // group index
  const L = 2 * Math.PI * R;        // round-trip length, µm
  const T = 0.85;                   // self-coupling coefficient (|κ|² = 1 − t² ≈ 0.28)
  const A = 0.985;                  // round-trip amplitude transmission (loss)
  const LAM0 = 1.550, LAM_MIN = 1.530, LAM_MAX = 1.570;  // µm

  function response(lam) {
    const phi = 2 * Math.PI * NG * L * (1 / lam - 1 / LAM0);
    const c = Math.cos(phi);
    const t2 = T * T, t4 = t2 * t2, a2 = A * A;
    const den = 1 - 2 * t2 * A * c + t4 * a2;
    const thru = (t2 * a2 - 2 * t2 * A * c + t2) / den;
    const drop = ((1 - t2) * (1 - t2) * A) / den;
    const build = (1 - t2) / den;                  // circulating power / input power
    return { thru, drop, build };
  }
  const BUILD_MAX = response(LAM0).build;

  // Spectrum geometry.
  const SX0 = 70, SX1 = 730, SY0 = 385, SH = 62;
  const xOf = (lam) => SX0 + (SX1 - SX0) * (lam - LAM_MIN) / (LAM_MAX - LAM_MIN);
  const yOf = (v) => SY0 - SH * v;
  (function drawSpectrum() {
    let pt = '', pd = '';
    for (let i = 0; i <= 400; i++) {
      const lam = LAM_MIN + (LAM_MAX - LAM_MIN) * i / 400;
      const r = response(lam);
      pt += (i ? 'L' : 'M') + xOf(lam).toFixed(1) + ' ' + yOf(r.thru).toFixed(1);
      pd += (i ? 'L' : 'M') + xOf(lam).toFixed(1) + ' ' + yOf(r.drop).toFixed(1);
    }
    sThru.setAttribute('d', pt); sDrop.setAttribute('d', pd);
  })();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hueOf = (p) => 20 + 250 * p;                // pseudo-colour sweep: amber → red → violet

  function render(p) {
    const lam = LAM_MIN + (LAM_MAX - LAM_MIN) * p;
    const r = response(lam);
    const light = getComputedStyle(document.documentElement).getPropertyValue('--glow-l').trim() || '58%';
    const col = 'hsl(' + hueOf(p).toFixed(1) + ' 90% ' + light + ')';
    [lIn, lThru, lDrop, lRing, fIn, fThru, fDrop, fRing, sDrop, sCursor].forEach((el) => el.setAttribute('stroke', col));
    const ring = r.build / BUILD_MAX;
    lIn.style.opacity = fIn.style.opacity = 0.9;
    lThru.style.opacity = fThru.style.opacity = (0.9 * r.thru).toFixed(3);
    lDrop.style.opacity = fDrop.style.opacity = (0.9 * r.drop).toFixed(3);
    lRing.style.opacity = fRing.style.opacity = (0.95 * ring).toFixed(3);
    lRing.setAttribute('stroke-width', (4 + 6 * ring).toFixed(2));
    const x = xOf(lam).toFixed(1);
    sCursor.setAttribute('x1', x); sCursor.setAttribute('x2', x);
    sLambda.setAttribute('x', x);
    sLambda.textContent = 'λ = ' + (lam * 1000).toFixed(1) + ' nm';
    if (cue) cue.style.opacity = (1 - smooth(p / 0.15)).toFixed(3);
  }

  // Reveal text chapters once they rise into the lower part of the viewport.
  let pending = Array.from(document.querySelectorAll('.reveal'));
  function reveal() {
    if (!pending.length) return;
    const limit = window.innerHeight * 0.85;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('in'); return false; }
      return true;
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const range = hero.offsetHeight - window.innerHeight;
      const p = range > 0 ? clamp(window.scrollY / range, 0, 1) : 0;
      render(p);
      reveal();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  document.getElementById('year').textContent = new Date().getFullYear();
})();
