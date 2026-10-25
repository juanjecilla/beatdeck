// Exports a built deck as files to hand out: a PDF and a folder of PNGs, one page per beat (or per scene).
//
//   npm run export                          every beat → artifacts/export/<deck-id>.pdf + png/SS-BB.png
//   npm run export -- --handout             one page per scene: its last beat (a handout; builds collapsed)
//   npm run export -- --notes               beat notes under each page (handout: the notes of the scene's beats)
//   npm run export -- --variant=theme=light a variant declared in deck.config.ts → artifacts/export/theme-light/
//   npm run export -- --variant=all         every combination of the declared variants
//
// Each beat is loaded from its URL (`?capture=1`), shot once nothing is animating, audited like `verify`, and printed
// by Chromium: a vector page, real text. The print is rasterised and compared with the screenshot; a page that
// differs by more than --diff becomes the screenshot plus an invisible text layer (still searchable) and is listed.
// What a still page cannot keep is reported per page as an "export loss": auto beats, frames that never settle,
// ambient motion (two shots 400 ms apart differ), text covered by another element, and variants or runtime state
// the deck changes outside the beat. Text overlap is an error; the rest are warnings (--strict makes them fail).
//
// Usage: node scripts/export.mjs [distDir=dist] [outDir=artifacts/export]
//          [--handout] [--notes] [--format=pdf,png]
//          [--variant=<name>=<value>]…  | [--variant=all]
//          [--diff=1.5]       max % of pixels the vector print may differ from the screenshot, and two frames 400 ms apart
//          [--max-wait=8000]  per-beat settle timeout (ms)   [--min-wait=500]   [--jobs=4]
//          [--strict]         warnings fail the run too
// Needs a Chromium-family browser (see scripts/lib.mjs). A multi-locale build is exported once per locale.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFiumLibrary } from '@hyzyla/pdfium';
import { PDFDocument, StandardFonts, TextRenderingMode, popGraphicsState, pushGraphicsState, rgb, setTextRenderingMode } from 'pdf-lib';
import { auditFrame, builtLocales, coveredWarnings, imageDiff, imageDiffRgba, launchBrowser, name, settle as settleOn, sleep, startServer, textRuns } from './lib.mjs';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const opt = (k, d) => +(args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const flagValues = (k) => args.filter((a) => a.startsWith(`--${k}=`)).map((a) => a.slice(k.length + 3));
const fail = (msg) => { console.error(`✕ export: ${msg}`); process.exit(1); };
const DIST = pos[0] ?? 'dist';
const OUT = pos[1] ?? 'artifacts/export';
const DIFF = opt('diff', 1.5);
const MAX_WAIT = opt('max-wait', 8000);
const MIN_WAIT = opt('min-wait', 500);
const JOBS = Math.max(1, opt('jobs', 4));
const STRICT = args.includes('--strict');
const HANDOUT = args.includes('--handout');
const NOTES = args.includes('--notes');
const FORMATS = (flagValues('format')[0] ?? 'pdf,png').split(',').map((f) => f.trim());
for (const f of FORMATS) if (!['pdf', 'png'].includes(f)) fail(`--format ${f}: use pdf and/or png`);
const WANT_PDF = FORMATS.includes('pdf'), WANT_PNG = FORMATS.includes('png');
const VARIANT_ARGS = flagValues('variant');

// a multi-locale build (<dist>/locales.json): one export per locale, one after the other (one preview port)
const locales = builtLocales(DIST);
if (locales) {
  rmSync(OUT, { recursive: true, force: true });
  const flags = args.filter((a) => a.startsWith('--'));
  const failed = [];
  for (const l of locales) {
    console.log(`\n── ${l} ──`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `${DIST}/${l}`, `${OUT}/${l}`, ...flags], { stdio: 'inherit' });
    if (r.status !== 0) failed.push(l);
  }
  console.log(`\n${failed.length ? '✕' : '✓'} export · ${locales.length} locales (${locales.join(', ')})${failed.length ? ` · failed: ${failed.join(', ')}` : ''}`);
  process.exit(failed.length ? 1 : 0);
}

const t0 = Date.now();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const { base: BASE, stop } = await startServer({ dist: DIST });
const browser = await launchBrowser();
const errors = [], remote = [];
const watch = (p) => {
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  return p;
};
const quit = async (msg) => { console.error(msg); errors.forEach((e) => console.error('  ' + e)); await browser.close(); stop(); process.exit(1); };

// a blank page for pixel comparisons, and PDFium (the engine of Chrome's PDF viewer) to rasterise the print
const probeContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const cmp = await probeContext.newPage();
await cmp.setContent('<body></body>');
const pdfium = WANT_PDF ? await PDFiumLibrary.init() : null;
/** % of pixels where the printed page differs from the screenshot. */
async function printDiffOf(pdf, shot) {
  const doc = await pdfium.loadDocument(Buffer.from(pdf));
  try {
    const img = await doc.getPage(0).render({ scale: 1920 / 1440, render: 'bitmap' });
    return await imageDiffRgba(cmp, shot, img.data, img.width, img.height);
  } finally {
    doc.destroy();
  }
}

// what the deck is: from the first frame
const probe = watch(await probeContext.newPage());
await probe.goto(`${BASE}?capture=1#1.1`);
try {
  await probe.waitForFunction(() => window.__beatdeck?.meta && document.fonts.status === 'loaded', null, { timeout: 15000 });
} catch {
  await quit('✕ export: the deck did not start (is dist/ built with this version of beatdeck? run npm run build)');
}
const deckInfo = await probe.evaluate(() => ({ ...window.__beatdeck, busy: undefined }));
const { meta, scenes, variants, beats } = deckInfo;
// state the deck sets on <html> that is not declared as a variant: a still export cannot switch it
const declaredAttrs = new Set(Object.values(variants).map((v) => v.attr));
const runtime = await probe.evaluate((declared) => {
  const own = new Set(['lang', 'class', 'style', 'dir']);
  const attrs = [...document.documentElement.attributes].filter((a) => !own.has(a.name) && !declared.includes(a.name)).map((a) => `${a.name}="${a.value}"`);
  const keys = Object.keys(localStorage).filter((k) => !k.startsWith('beatdeck:'));
  return { attrs, keys };
}, [...declaredAttrs]);
const undeclared = [
  ...runtime.attrs.map((a) => `<html ${a}> is set by the deck: if the speaker can change it live, declare it in \`variants\` (deck.config.ts → defineDeck) so the export can pin it`),
  ...runtime.keys.map((k) => `localStorage key "${k}" is set at load: state the deck keeps outside the beat is not part of the export`),
];
await probe.close();

// variants to export: --variant=all (every combination), --variant=name=value (the rest at their default), or the defaults
const names = Object.keys(variants);
const defaults = Object.fromEntries(names.map((n) => [n, variants[n].default]));
let combos;
if (VARIANT_ARGS.includes('all')) {
  combos = names.reduce((acc, n) => acc.flatMap((c) => variants[n].values.map((v) => ({ ...c, [n]: v }))), [{}]);
} else {
  const chosen = { ...defaults };
  for (const a of VARIANT_ARGS) {
    const [n, v] = a.split('=');
    if (!variants[n]) await quit(`✕ export: --variant=${a}: the deck declares ${names.length ? `variants ${names.join(', ')}` : 'no variants'} (deck.config.ts → defineDeck({ variants }))`);
    if (!variants[n].values.includes(v)) await quit(`✕ export: --variant=${a}: ${n} is one of ${variants[n].values.join(', ')}`);
    chosen[n] = v;
  }
  combos = [chosen];
}
if (!names.length && VARIANT_ARGS.length) await quit('✕ export: --variant given, but the deck declares no variants');
const comboName = (c) => names.filter((n) => c[n] !== defaults[n]).map((n) => `${n}-${c[n]}`).join('.');

// pages: every beat, or the last beat of each scene (handout)
const pagesOf = () => scenes.flatMap((sc, s) => (HANDOUT ? [sc.beats.length - 1] : sc.beats.map((_, b) => b)).map((b) => [s + 1, b + 1]));
const pages = pagesOf();

async function newContext(combo) {
  const scheme = names.map((n) => combo[n]).find((v) => v === 'light' || v === 'dark') ?? 'dark';
  const c = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: scheme });
  c.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname)) remote.push(r.url());
  });
  // the deck starts clean (no remembered theme) with the chosen variants on <html> from the first moment
  const pairs = names.map((n) => [variants[n].attr, combo[n]]);
  await c.addInitScript((p) => {
    try { localStorage.clear(); } catch { /* storage may be blocked */ }
    const set = () => document.documentElement && p.forEach(([a, v]) => document.documentElement.setAttribute(a, v));
    set();
    document.addEventListener('DOMContentLoaded', set);
  }, pairs);
  return { context: c, pairs };
}

/** Capture one page: screenshot, audit, print, and what the still page loses. */
async function capture(page, pairs, [s, b]) {
  await page.goto('about:blank');
  await page.goto(`${BASE}?capture=1#${s}.${b}`);
  await page.waitForFunction(() => window.__beatdeck && document.fonts.status === 'loaded', null, { timeout: 15000 });
  // a deck that applies its own theme at start-up wins over the init script: pin the variants again, then assert
  await page.evaluate((p) => p.forEach(([a, v]) => document.documentElement.setAttribute(a, v)), pairs);
  const settled = (await settleOn(page, { min: MIN_WAIT, max: MAX_WAIT })) < MAX_WAIT;
  const shot = await page.screenshot();
  const audit = await page.evaluate(auditFrame);
  await sleep(400);
  const shot2 = await page.screenshot();
  const ambient = await imageDiff(cmp, shot, shot2);
  const drift = await page.evaluate((p) => p.filter(([a, v]) => document.documentElement.getAttribute(a) !== v).map(([a]) => a), pairs);
  const losses = []; // { level: 'error' | 'warning' | 'info', text }
  audit.errors.forEach((text) => losses.push({ level: 'error', text }));
  drift.forEach((a) => losses.push({ level: 'error', text: `<html ${a}> changed after it was pinned: the deck sets it on its own` }));
  if (beats[s - 1][b - 1]) losses.push({ level: 'warning', text: 'auto beat: the page shows the end state; the motion is lost' });
  if (!settled) losses.push({ level: 'warning', text: `still animating after ${MAX_WAIT} ms: the page shows an arbitrary moment` });
  if (ambient > DIFF) losses.push({ level: 'warning', text: `ambient motion (two frames 400 ms apart differ by ${ambient.toFixed(1)}%): the page shows one arbitrary moment` });
  coveredWarnings(audit.covered).forEach((text) => losses.push({ level: 'warning', text }));
  let pdf = null, mode = 'vector', runs = null, printDiff = null;
  if (WANT_PDF) {
    await page.emulateMedia({ media: 'screen' });
    pdf = await page.pdf({ width: '1920px', height: '1080px', printBackground: true, pageRanges: '1' });
    // a moving frame cannot be compared with its own print: keep the vector page (already reported)
    if (ambient <= DIFF) {
      printDiff = await printDiffOf(pdf, shot);
      const d = printDiff;
      if (d > DIFF) {
        mode = 'raster';
        runs = await page.evaluate(textRuns);
        losses.push({ level: 'info', text: `print differs from the screen by ${d.toFixed(1)}%: page is an image with an invisible text layer` });
      }
    }
  }
  return { s, b, shot, pdf, mode, runs, losses, printDiff };
}

// ── PDF assembly ──────────────────────────────────────────────────────────────────────────────────────────────────
const PW = 1440, PH = 810; // 1920×1080 px at 96 dpi, in points: what Chromium prints
const K = 0.75;

async function buildPdf(results, notesOf) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const known = new Set(font.getCharacterSet());
  const safe = (t) => [...t].map((c) => (known.has(c.codePointAt(0)) ? c : '?')).join('');
  const wrap = (text, size, width) => {
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of safe(para).split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(next, size) > width) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
    }
    return lines;
  };
  doc.setTitle(meta.title);
  doc.setProducer('beatdeck export');
  doc.setCreator('beatdeck');
  for (const r of results) {
    const lines = NOTES ? wrap(notesOf(r), 18, PW - 80).filter((l, i, a) => l || a.slice(i).some(Boolean)) : [];
    const band = lines.length ? 40 + lines.length * 24 : 0;
    const page = doc.addPage([PW, PH + band]);
    if (r.mode === 'vector') {
      const [emb] = await doc.embedPdf(r.pdf, [0]);
      page.drawPage(emb, { x: 0, y: band, width: PW, height: PH });
    } else {
      page.drawImage(await doc.embedPng(r.shot), { x: 0, y: band, width: PW, height: PH });
      // invisible text on top of the picture, so the page can still be searched and copied
      let replaced = 0;
      page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Invisible));
      for (const t of r.runs) {
        const text = safe(t.t);
        replaced += [...t.t].filter((c) => !known.has(c.codePointAt(0))).length;
        const w = font.widthOfTextAtSize(text, 10) || 1;
        const size = Math.max(1, Math.min((t.w * K) / (w / 10), t.h * K));
        page.drawText(text, { x: t.x * K, y: band + PH - (t.y + t.h) * K, size, font });
      }
      page.pushOperators(popGraphicsState());
      if (replaced) r.losses.push({ level: 'info', text: `text layer: ${replaced} character(s) outside Latin-1 are not searchable` });
    }
    if (band) {
      page.drawRectangle({ x: 0, y: 0, width: PW, height: band, color: rgb(1, 1, 1) });
      lines.forEach((l, i) => page.drawText(l, { x: 40, y: band - 30 - i * 24, size: 18, font, color: rgb(0.15, 0.15, 0.15) }));
    }
  }
  return doc.save();
}

/** The notes for a page: the beat's, or (handout) those of every beat of the scene. */
const notesOf = (r) => {
  const sc = scenes[r.s - 1];
  const upTo = HANDOUT ? sc.beats : [sc.beats[r.b - 1]];
  return upTo.filter((b) => b.note).map((b) => (HANDOUT ? `${b.name}: ${b.note}` : b.note)).join('\n');
};

// ── run ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const summary = [];
for (const combo of combos) {
  const label = comboName(combo);
  const dir = label ? join(OUT, label) : OUT;
  mkdirSync(join(dir, 'png'), { recursive: true });
  if (label) console.log(`\n── ${label} ──`);
  const queue = pages.map((p, i) => [i, p]);
  const results = new Array(pages.length);
  const workers = await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
    const { context, pairs } = await newContext(combo);
    return { page: watch(await context.newPage()), pairs, context };
  }));
  await Promise.all(workers.map(async (w) => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [i, p] = item;
      try {
        results[i] = await capture(w.page, w.pairs, p);
      } catch (e) {
        errors.push(`[export] ${p.join('.')}: ${e.message.split('\n')[0]}`);
        results[i] = { s: p[0], b: p[1], shot: null, pdf: null, mode: 'vector', runs: null, losses: [{ level: 'error', text: 'the page could not be captured' }] };
      }
    }
  }));
  for (const w of workers) await w.context.close();
  const ok = results.filter((r) => r.shot);
  if (WANT_PNG) for (const r of ok) writeFileSync(join(dir, 'png', `${name(r.s, r.b)}.png`), r.shot);
  else rmSync(join(dir, 'png'), { recursive: true, force: true });
  let file = null;
  if (WANT_PDF && ok.length) {
    file = `${meta.id}${HANDOUT ? '.handout' : ''}${NOTES ? '.notes' : ''}.pdf`;
    writeFileSync(join(dir, file), await buildPdf(ok, notesOf));
  }
  const report = {
    deck: meta, variant: Object.fromEntries(names.map((n) => [n, combo[n]])), handout: HANDOUT, notes: NOTES, file,
    pages: results.map((r) => ({ page: `${r.s}.${r.b}`, mode: r.mode, printDiff: r.printDiff === null ? null : +r.printDiff.toFixed(2), losses: r.losses })),
    runtime: undeclared,
  };
  writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2));
  summary.push({ label, dir, file, results });
}

pdfium?.destroy();
await browser.close();
stop();

// ── report ────────────────────────────────────────────────────────────────────────────────────────────────────────
const all = summary.flatMap((s) => s.results);
const count = (level) => all.reduce((n, r) => n + r.losses.filter((l) => l.level === level).length, 0) + (level === 'warning' ? undeclared.length : 0);
const nErr = count('error') + errors.length + remote.length, nWarn = count('warning');
const ok = !nErr && !(STRICT && nWarn);
const rasterPages = all.filter((r) => r.mode === 'raster').map((r) => `${r.s}.${r.b}`);
const rasters = rasterPages.length;
const secs = Math.round((Date.now() - t0) / 1000);
console.log(`${ok ? '✓' : '✕'} export · ${meta.id} · ${pages.length} ${HANDOUT ? 'scene' : 'beat'} page(s)${summary.length > 1 ? ` × ${summary.length} variants` : ''} · ${secs}s`);
for (const s of summary) {
  console.log(`  ${s.dir}/${s.file ?? ''}${WANT_PNG ? `  + png/ (${s.results.filter((r) => r.shot).length})` : ''}`);
}
if (WANT_PDF) console.log(`  vector pages: ${all.length - rasters}/${all.length}${rasters ? ` · raster with text layer: ${rasterPages.join(', ')}` : ''}`);
const lossLines = [];
for (const s of summary) for (const r of s.results) for (const l of r.losses) if (l.level !== 'info') lossLines.push(`${s.label ? s.label + ' ' : ''}${r.s}.${r.b} ${l.level === 'error' ? '✕' : '⚠'} ${l.text}`);
console.log(`  export loss: ${lossLines.length || undeclared.length ? `${nErr + nWarn} (${nErr} error${nErr === 1 ? '' : 's'}, ${nWarn} warning${nWarn === 1 ? '' : 's'}${STRICT ? ', failing: --strict' : ', warnings not failing'})` : 'none'}`);
lossLines.slice(0, 25).forEach((l) => console.log('    ' + l));
if (lossLines.length > 25) console.log(`    … ${lossLines.length - 25} more, see report.json`);
undeclared.forEach((u) => console.log('    ⚠ ' + u));
errors.slice(0, 10).forEach((e) => console.log('    ' + e));
remote.forEach((u) => console.log('    remote: ' + u));
console.log(`  report → ${OUT}/${summary.length > 1 || summary[0].label ? '…/' : ''}report.json`);
process.exit(ok ? 0 : 1);
