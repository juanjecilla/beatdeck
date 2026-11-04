/**
 * Sizing of `CodeBlock` (pure, no imports, so Node tests can load it). The block's geometry in stage pixels at any
 * font size: title bar, body padding (top + bottom, left + right), borders.
 */
export const CODE_BAR = 54;
export const CODE_PAD_Y = 56;
export const CODE_PAD_X = 80;
export const CODE_BORDER = 2;
/** Advance width of the mono font, in em, and the line height used by `.bd-term`. */
const ADVANCE = 0.6;
const LINE = 1.5;
const LABEL_ROW = 1.25;
/** Mark labels (`.bd-mk::after`): offset from the mark's start, size `max(18px, 0.6em)`, letter-spacing, in em. */
const LABEL_LEFT = 0.1;
const LABEL_SIZE = 0.6;
const LABEL_MIN_PX = 18;
const LABEL_SPACING = 0.04;

/** Rendered width of a line in columns: a tab advances to the next multiple of `tab` (the CSS `tab-size`, 4). */
export function columns(s: string, tab = 4): number {
  let c = 0;
  for (const ch of s) c = ch === '\t' ? c + tab - (c % tab) : c + 1;
  return c;
}

export interface FitLine { t: string; labels?: number; marks?: { text: string; nth?: number; label?: string }[] }

/** Right edge, in px from the line's start, of the furthest mark label of any line at font size `px` (0 if none). */
export function labelReach(lines: FitLine[], px: number): number {
  const labelPx = Math.max(LABEL_MIN_PX, LABEL_SIZE * px);
  let reach = 0;
  for (const l of lines) {
    for (const m of l.marks ?? []) {
      if (!m.label) continue;
      let i = -1;
      for (let k = 0; k <= (m.nth ?? 0); k++) i = l.t.indexOf(m.text, i + 1);
      if (i < 0) continue; // a missing mark is reported by markRanges when it renders
      const left = columns(l.t.slice(0, i)) * ADVANCE * px + LABEL_LEFT * px;
      reach = Math.max(reach, left + m.label.length * (ADVANCE + LABEL_SPACING) * labelPx);
    }
  }
  return reach;
}

/**
 * Largest font size (≤ `size`, ≥ 20) at which a block placed at (x, y) stays above `bottom` and left of `right`:
 * its text (tabs to the next 4-column stop) and every mark label that can appear (enabled or not, so the size does
 * not change from beat to beat). `defaults` are the bounds used when `fit` gives none.
 */
export function fitSize(
  lines: FitLine[], size: number, fit: { x: number; y: number; right?: number; bottom?: number }, defaults: { right: number; bottom: number },
): number {
  const rows = lines.reduce((n, l) => n + LINE + (l.labels ?? 0) * LABEL_ROW, 0);
  const cols = Math.max(...lines.map((l) => columns(l.t)), 1);
  const right = fit.right ?? defaults.right;
  const byHeight = (((fit.bottom ?? defaults.bottom) - fit.y - CODE_BAR - CODE_PAD_Y - CODE_BORDER) / rows);
  const byWidth = (right - fit.x - CODE_PAD_X - CODE_BORDER) / (cols * ADVANCE);
  let px = Math.max(20, Math.floor(Math.min(size, byHeight, byWidth)));
  // labels hang off the line: shrink until the furthest one is inside the right bound too (body padding-left = half CODE_PAD_X)
  const room = right - fit.x - CODE_PAD_X / 2 - CODE_BORDER;
  while (px > 20 && labelReach(lines, px) > room) px -= 1;
  return px;
}
