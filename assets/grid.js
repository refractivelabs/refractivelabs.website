// Perspective floor grid. Lines glide toward the viewer with time, and scrolling
// pushes the floor forward too, so the motion tracks the hand on the wheel.
(function () {
  const plane = document.getElementById('floorPlane');
  const hero = document.getElementById('hero');
  if (!plane || !hero) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = reduce ? 0 : 22;   // px of plane per second
  const SCROLL = 0.35;             // px of plane per px scrolled
  let t0 = performance.now();

  function frame(now) {
    const dt = (now - t0) / 1000;
    const heroRange = Math.max(1, hero.offsetHeight - window.innerHeight);
    const sy = Math.min(window.scrollY, heroRange);
    plane.style.setProperty('--gy', (dt * SPEED + sy * SCROLL).toFixed(1) + 'px');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
