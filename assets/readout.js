// Plain metric readout. Same interface as the old VFD: Readout(el, fields) -> { set(i, str) }.
window.Readout = function (el, fields) {
  el.innerHTML = '';
  const vals = fields.map((f) => {
    const item = document.createElement('div'); item.className = 'ro-item';
    const dt = document.createElement('dt'); dt.textContent = f.label;
    const dd = document.createElement('dd');
    const v = document.createElement('span'); v.className = 'ro-val'; v.textContent = '–';
    dd.appendChild(v);
    if (f.unit) { const u = document.createElement('span'); u.className = 'ro-unit'; u.textContent = f.unit; dd.appendChild(u); }
    item.appendChild(dt); item.appendChild(dd); el.appendChild(item);
    return v;
  });
  return { set(i, str) { if (vals[i] && vals[i].textContent !== str) vals[i].textContent = str; } };
};
