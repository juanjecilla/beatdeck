#!/usr/bin/env node
// WCAG 2.x contrast audit of themes/poster.css over every combination a deck can show:
//   2 editions (day, dark) × every tone, plus the default (no tone).
//   node tools/contrast.mjs [themes/poster.css]      exits 1 on any failure (text needs 4.5:1)
// It cascades the rules the way the browser would for <html data-theme="…" data-tone="…">: every selector's
// [data-theme='x'] / [data-tone='y'] conditions must hold, and later rules win.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2] ?? (existsSync('themes/poster.css') ? 'themes/poster.css' : 'poster.css');
const css = readFileSync(resolve(file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');

const blocks = [...css.matchAll(/([^{}@]+?)\s*{([^{}]*)}/g)]
  .filter((m) => /^:root/.test(m[1].trim()))
  .map((m) => ({
    attrs: Object.fromEntries([...m[1].matchAll(/\[data-(theme|tone)='([^']+)'\]/g)].map((a) => [a[1], a[2]])),
    decls: Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])),
  }));
const tones = [null, ...new Set(blocks.map((b) => b.attrs.tone).filter(Boolean))];
const editions = ['day', 'dark'];

const parse = (v) => {
  if (v.startsWith('#')) {
    const h = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join('') : v.slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const [r, g, b, a = 1] = v.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
  return { r, g, b, a };
};
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let bad = 0, n = 0;
for (const edition of editions) for (const tone of tones) {
  const t = {};
  for (const b of blocks) {
    const okEdition = !b.attrs.theme || (b.attrs.theme === 'dark') === (edition === 'dark');
    const okTone = !b.attrs.tone || b.attrs.tone === tone;
    if (okEdition && okTone) Object.assign(t, b.decls);
  }
  const pairs = [['ink', 'bg'], ['ink-2', 'bg'], ['ink-3', 'bg'], ['accent', 'bg'], ['sheet-ink', 'sheet'], ['sheet-dim', 'sheet'], ['sheet-accent', 'sheet']];
  for (const [fg, bgk] of pairs) {
    const bgc = parse(t[bgk]);
    const r = ratio(over(parse(t[fg]), bgc), bgc);
    n++;
    if (r < 4.5) { bad++; console.log(`FAIL ${edition.padEnd(4)} tone ${String(tone ?? 'default').padEnd(8)} ${fg} on ${bgk}  ${r.toFixed(2)}`); }
  }
}
console.log(bad ? `\n${bad} of ${n} pairs below 4.5:1` : `all ${n} text pairs ≥ 4.5:1 (${editions.length} editions × ${tones.length} tones)`);
process.exit(bad ? 1 : 0);
