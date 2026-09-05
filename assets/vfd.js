// Vacuum-fluorescent style seven-segment display, rendered into an <svg>.
//   const d = VFD(svgEl, [{ label: 'OUT 1', cells: 4 }, ...], { width: 760, height: 104 });
//   d.set(0, '0.73');      // a '.' lights the decimal point of the preceding digit
window.VFD = function (svgEl, fields, opts) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = (opts && opts.width) || 760, H = (opts && opts.height) || 104;
  const CW = 26, DY = 22, PAD = 40;
  const SEG = {
    a: 'M3 0 h14 l-2.5 2.5 h-9 z', b: 'M20 1 v14 l-2.5 -2.5 v-9 z', c: 'M20 19 v14 l-2.5 -2.5 v-9 z',
    d: 'M3 34 h14 l-2.5 -2.5 h-9 z', e: 'M0 19 v14 l2.5 -2.5 v-9 z', f: 'M0 1 v14 l2.5 -2.5 v-9 z',
    g: 'M3 17 h14 l-2 1.6 h-10 z M3 17 h14 l-2 -1.6 h-10 z'
  };
  const MAP = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
                'A': 'abcefg', 'b': 'cdefg', 'C': 'adef', 'd': 'bcdeg', 'E': 'adefg', 'F': 'aefg', 'H': 'bcefg', 'L': 'def', 'P': 'abefg', 'U': 'bcdef', 'o': 'cdeg', 'n': 'ceg', 'r': 'eg', 't': 'defg' };
  const el = (tag, attrs, cls) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (cls) e.setAttribute('class', cls); return e; };

  svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svgEl.innerHTML = '';
  const defs = el('defs'); defs.innerHTML =
    '<filter id="vglow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<linearGradient id="vglass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>';
  svgEl.appendChild(defs);
  svgEl.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, rx: 8 }, 'vfd-panel'));
  svgEl.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, rx: 8 }, 'vfd-glass'));

  const total = fields.reduce((s, f) => s + f.cells * CW, 0);
  const gap = fields.length > 1 ? (W - 2 * PAD - total) / (fields.length - 1) : 0;
  let x = PAD;
  const rows = fields.map((f) => {
    const fg = el('g', { transform: 'translate(' + x.toFixed(1) + ',' + DY + ')' });
    const row = [];
    for (let i = 0; i < f.cells; i++) {
      const cg = el('g', { transform: 'translate(' + (i * CW) + ',0)' });
      const segs = {};
      for (const k in SEG) { const p = el('path', { d: SEG[k] }, 'seg'); cg.appendChild(p); segs[k] = p; }
      const dp = el('circle', { cx: 23.5, cy: 33, r: 1.8 }, 'seg'); cg.appendChild(dp); segs.dp = dp;
      fg.appendChild(cg); row.push(segs);
    }
    const lbl = el('text', { x: 0, y: 58 }, 'vfd-label'); lbl.textContent = f.label; fg.appendChild(lbl);
    svgEl.appendChild(fg);
    x += f.cells * CW + gap;
    return row;
  });

  function set(fi, str) {
    const row = rows[fi], n = row.length;
    const chars = [];
    for (const ch of String(str)) { if (ch === '.' && chars.length) chars[chars.length - 1].dp = true; else chars.push({ ch, dp: false }); }
    while (chars.length < n) chars.unshift({ ch: ' ', dp: false });
    while (chars.length > n) chars.shift();
    for (let i = 0; i < n; i++) {
      const on = MAP[chars[i].ch] || '';
      for (const k in SEG) row[i][k].classList.toggle('on', on.indexOf(k) >= 0);
      row[i].dp.classList.toggle('on', chars[i].dp);
    }
  }
  return { set };
};
