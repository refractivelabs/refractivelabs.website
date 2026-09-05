// Hover / focus tooltip for the scaling chart. Values are also in the direct labels and the data table.
(function () {
  'use strict';
  const tip = document.getElementById('chartTip');
  if (!tip) return;
  const wrap = tip.parentElement;
  const show = (el) => {
    tip.textContent = '';
    const v = document.createElement('strong'); v.textContent = el.dataset.value;
    const n = document.createElement('span'); n.textContent = el.dataset.name + ' · ' + el.dataset.year;
    const s = document.createElement('small'); s.textContent = el.dataset.series;
    tip.append(v, n, s);
    tip.hidden = false;
    const r = wrap.getBoundingClientRect(), c = el.getBoundingClientRect();
    let x = c.left - r.left + c.width / 2, y = c.top - r.top;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, x - tip.offsetWidth / 2)) + 'px';
    tip.style.top = (y - tip.offsetHeight - 10) + 'px';
  };
  wrap.querySelectorAll('.hit').forEach((el) => {
    el.setAttribute('tabindex', '0');
    el.addEventListener('pointerenter', () => show(el));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
    el.addEventListener('blur', () => { tip.hidden = true; });
  });
})();
