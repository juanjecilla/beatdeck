// DOM audit of the current frame. Plain JS on purpose: Node scripts (verify, shot, export) pass it to
// `page.evaluate`, which serializes the function, so `auditFrame` must stay self-contained (no imports, no closures).
// The dev badge imports it too. Types: audit.d.ts.

/**
 * Looks only at text that is actually visible: effective opacity (own × ancestors) > 0.5, not hidden, not inside
 * `[data-audit="off"]`. Returns { errors, warnings, edges, covered, exact } — `edges` are safe-area warnings (text
 * closer than the deck's `audit.safeMargin` to an edge, one per text node and edge); `covered` is text with a painted
 * element on top of it (one per text node); `exact` are the texts that must match the source verbatim
 * (Terminal lines and `[data-exact]` elements).
 */
export function auditFrame() {
  const stage = document.querySelector('.stage');
  const res = { errors: [], warnings: [], exact: [], edges: [], covered: [] };
  if (!stage) return res;
  const sr = stage.getBoundingClientRect();
  const k = sr.width / 1920;
  const visible = (el) => {
    let o = 1;
    for (let e = el; e && e !== stage.parentElement; e = e.parentElement) {
      if (e.dataset?.audit === 'off') return false;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      o *= +cs.opacity;
    }
    return o > 0.5;
  };
  const margin = window.__beatdeck?.audit?.safeMargin ?? null;
  // an opaque cut (or operator blackout) hides everything before it in the DOM; only the Overlay is drawn above it
  const cut = stage.querySelector('[data-bd-cut]');
  const cutOn = !!cut && +getComputedStyle(cut).opacity > 0.5;
  const nearEdge = new Map(); // text node → { edge → entry }: the closest line of each node per edge
  const coveredBy = new Map(); // text node → { t, by, hits }: the most-covered line of each node
  const short = (t) => JSON.stringify(t.trim().replace(/\s+/g, ' ').slice(0, 40));
  const label = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  // does this element paint anything of its own? (an empty layer on top of text is not a cover)
  // (an <svg> or <canvas> box says nothing about what is drawn in it: only SVG shapes the hit test returns count)
  const paints = (e) => {
    if (/^(img|video|picture)$/i.test(e.tagName)) return true;
    if (/^(svg|canvas)$/i.test(e.tagName)) return false;
    const cs = getComputedStyle(e);
    if (e instanceof SVGElement) {
      if (/^(text|tspan|g|defs)$/i.test(e.tagName)) return false;
      return (cs.fill !== 'none' && +cs.fillOpacity > 0.3) || (cs.stroke !== 'none' && +cs.strokeOpacity > 0.3 && parseFloat(cs.strokeWidth) > 1);
    }
    if (cs.backgroundImage !== 'none') return true;
    const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const p = m[1].split(/[,/ ]+/).filter(Boolean);
    return p.length < 4 || +p[3] > 0.5;
  };
  // elementsFromPoint skips `pointer-events: none`: lift it while sampling
  const lift = document.createElement('style');
  lift.textContent = '*{pointer-events:auto!important}';
  document.head.appendChild(lift);
  const boxes = [];
  const small = new Set();
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  try {
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || !visible(el)) continue;
      const cs = getComputedStyle(el);
      // characters that change meaning under text-transform: uppercase (µ → Greek Μ, ß → SS)
      if (/[µß]/.test(n.textContent) && cs.textTransform === 'uppercase') {
        res.errors.push(`uppercase changes ${short(n.textContent)} (µ/ß): wrap the unit in <span className="keep-case">`);
      }
      const px = parseFloat(cs.fontSize) / k;
      if (px < 17.5) small.add(`${short(n.textContent)} is ${Math.round(px)} px (stage minimum 18)`);
      const underCut = cutOn && cut.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        // the line box of large type is much taller than its glyphs: keep the central ~0.8 em for overlap tests
        const fpx = parseFloat(cs.fontSize);
        const inset = Math.max(0, (r.height - 0.8 * fpx) / 2);
        const b = { x: (r.left - sr.left) / k, y: (r.top + inset - sr.top) / k, w: r.width / k, h: (r.height - 2 * inset) / k, t: n.textContent, n };
        boxes.push(b);
        if (b.x < -2 || b.y < -2 || b.x + b.w > 1922 || b.y + b.h > 1082) {
          res.errors.push(`${short(b.t)} is outside the 1920×1080 stage (x ${Math.round(b.x)}…${Math.round(b.x + b.w)}, y ${Math.round(b.y)}…${Math.round(b.y + b.h)})`);
          continue;
        }
        if (margin && !el.closest('[data-bd-chrome]') && !underCut) {
          // safe area: inside the stage but cramped against an edge
          // the full line box, not the trimmed one used for overlaps: authors place text by its box
          const top = (r.top - sr.top) / k, bottom = (r.bottom - sr.top) / k;
          const gaps = [['left', b.x, margin.x], ['right', 1920 - (b.x + b.w), margin.x], ['top', top, margin.y], ['bottom', 1080 - bottom, margin.y]];
          for (const [edge, d, m] of gaps) {
            if (d >= m) continue;
            const mine = nearEdge.get(n) ?? nearEdge.set(n, {}).get(n);
            if (!mine[edge] || d < mine[edge].d) mine[edge] = { t: short(b.t), edge, d, m };
          }
        }
        // covered text: a painted element above the text at most of five sample points along the line
        if (!underCut && !el.closest('[data-bd-chrome]')) {
          const above = new Map(); // coverer → points it covers
          for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
            const vx = sr.left + (b.x + f * b.w) * k, vy = sr.top + (b.y + b.h / 2) * k;
            for (const c of document.elementsFromPoint(vx, vy)) {
              if (c === el || c.contains(el) || el.contains(c)) break; // reached the text's own layer
              if (c === cut || cut?.contains(c) || c.closest('[data-bd-chrome]') || !stage.contains(c) || !visible(c) || !paints(c)) continue;
              above.set(c, (above.get(c) ?? 0) + 1);
              break;
            }
          }
          for (const [c, hits] of above) {
            if (hits < 3) continue;
            const prev = coveredBy.get(n);
            if (!prev || hits > prev.hits) coveredBy.set(n, { t: short(b.t), by: label(c), hits });
          }
        }
      }
    }
  } finally {
    lift.remove();
  }
  // overlapping text: two different text nodes whose line boxes share > 30% of the smaller one
  const seen = new Set();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.n === c.n) continue;
      const ix = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
      const iy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
      if (ix <= 0 || iy <= 0) continue;
      if (ix * iy > 0.3 * Math.min(a.w * a.h, c.w * c.h)) {
        const key = `${a.t}|${c.t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        res.errors.push(`text overlaps: ${short(a.t)} and ${short(c.t)} (add data-audit="off" if intended)`);
      }
    }
  }
  for (const byEdge of nearEdge.values()) for (const e of Object.values(byEdge)) res.edges.push({ ...e, d: Math.round(e.d) });
  for (const { t, by } of coveredBy.values()) res.covered.push({ t, by });
  res.warnings.push(...small);
  for (const el of stage.querySelectorAll('.bd-term-line, [data-exact]')) {
    if (visible(el) && el.textContent.trim()) res.exact.push({ t: el.textContent, term: el.classList.contains('bd-term-line') });
  }
  return res;
}
