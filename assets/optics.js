// Scroll-driven refraction through a plane-parallel slab.
// Physics: Snell's law n1 sin(θi) = n2 sin(θt); Cauchy dispersion n(λ) = A + B/λ²;
// unpolarized Fresnel reflectance R = (Rs + Rp)/2 at the entry face.
(function () {
  'use strict';
  const hero = document.getElementById('hero');
  const cue = document.getElementById('cue');
  const gSpec = document.getElementById('spectrum');
  const rIn = document.getElementById('in');
  const rMid = document.getElementById('mid');
  const rOut = document.getElementById('out');
  const rRef = document.getElementById('reflect');

  // Geometry in SVG units (viewBox 800x400).
  const X0 = 340, X1 = 460;          // slab faces
  const Y0 = 180;                    // entry point on the left face
  const D = X1 - X0;                 // slab thickness
  const XMIN = 30, XMAX = 770, YMIN = 10, YMAX = 390;

  // Dispersion: exaggerated Cauchy coefficients so the spread is visible.
  const A = 1.42, B = 0.06;          // λ in micrometres
  const N_WHITE = A + B / (0.55 * 0.55);
  const SPECTRUM = [
    [0.400, '#7a3cff'], [0.440, '#3a5bff'], [0.480, '#2aa6ff'], [0.520, '#2fd07a'],
    [0.570, '#e8d23a'], [0.610, '#ff8c2a'], [0.660, '#ff3b3b']
  ];
  const nOf = (lam) => A + B / (lam * lam);

  // Build spectral ray elements once: for each wavelength, an inside and an exit segment.
  const specRays = SPECTRUM.map(([lam, color]) => {
    const mk = () => {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('class', 'ray disp');
      l.setAttribute('stroke', color);
      gSpec.appendChild(l);
      return l;
    };
    return { n: nOf(lam), mid: mk(), out: mk() };
  });

  const set = (el, x1, y1, x2, y2) => {
    el.setAttribute('x1', x1.toFixed(2)); el.setAttribute('y1', y1.toFixed(2));
    el.setAttribute('x2', x2.toFixed(2)); el.setAttribute('y2', y2.toFixed(2));
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // Ray from (x,y) in direction (dx,dy) clipped to the canvas box.
  function clipRay(x, y, dx, dy) {
    let t = Infinity;
    if (dx > 0) t = Math.min(t, (XMAX - x) / dx); else if (dx < 0) t = Math.min(t, (XMIN - x) / dx);
    if (dy > 0) t = Math.min(t, (YMAX - y) / dy); else if (dy < 0) t = Math.min(t, (YMIN - y) / dy);
    return [x + dx * t, y + dy * t];
  }

  function fresnelR(thI, n) {
    const s = Math.sin(thI), c = Math.cos(thI);
    const st = s / n; if (st >= 1) return 1;
    const ct = Math.sqrt(1 - st * st);
    const rs = (c - n * ct) / (c + n * ct);
    const rp = (n * c - ct) / (n * c + ct);
    return 0.5 * (rs * rs + rp * rp);
  }

  function render(p) {
    // Incidence angle sweeps from 12° to 62° with scroll progress.
    const thI = (12 + 50 * smooth(p)) * Math.PI / 180;
    const cI = Math.cos(thI), sI = Math.sin(thI);

    // Incoming ray travels up-right; trace backwards from the entry point to the canvas edge.
    const [ax, ay] = clipRay(X0, Y0, -cI, sI);
    set(rIn, ax, ay, X0, Y0);

    // Reflected ray at the entry face (angle of reflection = angle of incidence).
    const [bx, by] = clipRay(X0, Y0, -cI, -sI);
    set(rRef, X0, Y0, bx, by);
    rRef.style.opacity = clamp(fresnelR(thI, N_WHITE) * 2.5, 0.04, 0.6).toFixed(3);

    // Inside + exit for a given index. The exit ray is parallel to the incoming ray
    // (plane-parallel slab), laterally displaced by the refraction inside.
    const trace = (n, midEl, outEl) => {
      const sT = sI / n;
      const tT = sT / Math.sqrt(1 - sT * sT);          // tan(θt)
      const yExit = Y0 - D * tT;
      set(midEl, X0, Y0, X1, yExit);
      const [ex, ey] = clipRay(X1, yExit, cI, -sI);
      set(outEl, X1, yExit, ex, ey);
    };

    // White beam first, then the spectrum. Colours fade in as the white beam fades out.
    trace(N_WHITE, rMid, rOut);
    const k = smooth((p - 0.3) / 0.45);
    rMid.style.opacity = rOut.style.opacity = (1 - 0.9 * k).toFixed(3);
    specRays.forEach((r) => {
      trace(r.n, r.mid, r.out);
      r.mid.style.opacity = r.out.style.opacity = (0.85 * k).toFixed(3);
    });

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
