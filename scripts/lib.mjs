// Shared by verify.mjs and shot.mjs.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

/**
 * A headless Chromium-family browser: $BEATDECK_BROWSER (an executable path), else installed Chrome, else Edge,
 * else Playwright's own Chromium (`npx playwright-core install chromium`).
 */
export async function launchBrowser() {
  const args = ['--force-device-scale-factor=1'];
  const tries = [
    ...(process.env.BEATDECK_BROWSER ? [{ executablePath: process.env.BEATDECK_BROWSER }] : []),
    { channel: 'chrome' }, { channel: 'msedge' }, {},
  ];
  for (const t of tries) {
    try { return await chromium.launch({ headless: true, args, ...t }); } catch { /* next */ }
  }
  console.error('✕ no browser found for screenshots. Install Google Chrome, or run `npx playwright-core install chromium`,');
  console.error('  or set BEATDECK_BROWSER to a Chromium/Chrome/Edge executable.');
  process.exit(1);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const name = (s, b) => `${String(s).padStart(2, '0')}-${String(b).padStart(2, '0')}`;

/**
 * Serve the deck locally: `vite preview` of a build (`dist`), or the dev server (`dev: true`, no build needed;
 * `mode` picks an example). Resolves to { base, stop }.
 */
export async function startServer({ dist = 'dist', dev = false, mode, port = 4174, env = {} } = {}) {
  const vite = 'node_modules/vite/bin/vite.js';
  const argv = dev
    ? [vite, '--host', '127.0.0.1', '--port', String(port), '--strictPort', ...(mode ? ['--mode', mode] : [])]
    : [vite, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  const server = spawn(process.execPath, argv, { stdio: 'pipe', env: { ...process.env, ...env } });
  const stop = () => { try { server.kill(); } catch { /* already gone */ } };
  process.on('exit', stop);
  const base = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) return { base, stop }; } catch { /* not up yet */ }
    await sleep(150);
  }
  stop();
  throw new Error(`could not start vite on ${base}`);
}

/** Wait until nothing animates (GSAP + finite CSS; two quiet polls in a row), at least `min`, at most `max` ms. */
export async function settle(page, { min = 500, max = 8000 } = {}) {
  const start = Date.now();
  await sleep(min);
  let quiet = 0;
  while (Date.now() - start < max) {
    const busy = await page.evaluate(() => window.__beatdeck?.busy?.() ?? false);
    quiet = busy ? 0 : quiet + 1;
    if (quiet >= 2) return Date.now() - start;
    await sleep(120);
  }
  return Date.now() - start;
}

// The frame audit lives in the engine (src/beatdeck/audit.js) so the dev badge shares it; scripts pass it to page.evaluate.
import { coveredLine, edgeLine } from '../src/beatdeck/audit.js';
export { auditFrame } from '../src/beatdeck/audit.js';

/**
 * % of pixels that differ (by more than 40 in any channel) between two PNGs, decoded in `page` (any page).
 * `a` and `b` are Buffers (or data URLs); the images must have the same size. `scale` < 1 compares both
 * downsampled (averaged), which ignores antialiasing and keeps structural differences.
 */
export async function imageDiff(page, a, b, scale = 1) {
  const url = (x) => (typeof x === 'string' ? x : `data:image/png;base64,${x.toString('base64')}`);
  return page.evaluate(async ([ua, ub, sc]) => {
    const img = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const px = (i) => {
      const c = document.createElement('canvas'); c.width = Math.round(i.width * sc); c.height = Math.round(i.height * sc);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height);
      return x.getImageData(0, 0, c.width, c.height).data;
    };
    const [A, B] = (await Promise.all([img(ua), img(ub)])).map(px);
    let n = 0;
    for (let k = 0; k < A.length; k += 4) if (Math.abs(A[k] - B[k]) > 40 || Math.abs(A[k + 1] - B[k + 1]) > 40 || Math.abs(A[k + 2] - B[k + 2]) > 40) n++;
    return (100 * n) / (A.length / 4);
  }, [url(a), url(b), scale]);
}

/**
 * Like imageDiff, between a PNG (Buffer) and a raw RGBA bitmap of `w`×`h` px (what PDFium renders). Both are
 * downsampled by `scale` the same way before they are compared.
 */
export async function imageDiffRgba(page, png, rgba, w, h, scale = 1) {
  return page.evaluate(async ([u, b64, w, h, sc]) => {
    const i = await new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = u; });
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const full = document.createElement('canvas'); full.width = w; full.height = h;
    full.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes.buffer), w, h), 0, 0);
    const px = (src) => {
      const c = document.createElement('canvas'); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
      return x.getImageData(0, 0, c.width, c.height).data;
    };
    const A = px(i), B = px(full);
    let n = 0;
    for (let k = 0; k < A.length; k += 4) if (Math.abs(A[k] - B[k]) > 40 || Math.abs(A[k + 1] - B[k + 1]) > 40 || Math.abs(A[k + 2] - B[k + 2]) > 40) n++;
    return (100 * n) / (A.length / 4);
  }, [`data:image/png;base64,${png.toString('base64')}`, Buffer.from(rgba).toString('base64'), w, h, scale]);
}

/**
 * Visible text of the current frame as lines in stage px, `[{ t, x, y, w, h, size }]` (runs in the page via
 * page.evaluate, self-contained). Same visibility rule as auditFrame; used for the text layer of raster PDF pages.
 */
export function textRuns() {
  const stage = document.querySelector('.stage');
  if (!stage) return [];
  const sr = stage.getBoundingClientRect();
  const k = sr.width / 1920;
  const visible = (el) => {
    let o = 1;
    for (let e = el; e && e !== stage.parentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      o *= +cs.opacity;
    }
    return o > 0.5;
  };
  const out = [];
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize) / k;
    // one run per line box: split the node's text at the line breaks the layout made
    const text = n.textContent;
    let from = 0, lastTop = null, lastRect = null;
    const flush = (end) => {
      const t = text.slice(from, end).replace(/\s+/g, ' ').trim();
      if (t && lastRect) out.push({ t: cs.textTransform === 'uppercase' ? t.toUpperCase() : t, x: (lastRect.left - sr.left) / k, y: (lastRect.top - sr.top) / k, w: lastRect.width / k, h: lastRect.height / k, size });
    };
    const range = document.createRange();
    for (let i = 0; i < text.length; i++) {
      range.setStart(n, i); range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (!r || r.width === 0) continue;
      if (lastTop !== null && Math.abs(r.top - lastTop) > r.height / 2) { flush(i); from = i; lastRect = null; }
      lastTop = r.top;
      lastRect = lastRect ? { left: Math.min(lastRect.left, r.left), top: Math.min(lastRect.top, r.top), width: Math.max(lastRect.left + lastRect.width, r.right) - Math.min(lastRect.left, r.left), height: Math.max(lastRect.height, r.height) } : { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    flush(text.length);
  }
  return out;
}

/** Locales of a multi-locale build (`<dist>/locales.json`, written by scripts/build.mjs), else null. */
export function builtLocales(dist) {
  try { return JSON.parse(readFileSync(`${dist}/locales.json`, 'utf8')).locales; } catch { return null; }
}

/** Covered-text and safe-area entries from auditFrame as warning lines. */
export const coveredWarnings = (covered) => covered.map(coveredLine);
export const edgeWarnings = (edges) => edges.map(edgeLine);

/**
 * Render a contact sheet of frames (`[{ file, label }]`) into `out` using `page` (any blank page).
 * Four 480×270 thumbnails per row, labelled.
 */
export async function contactSheet(page, frames, out) {
  const cols = 4, w = 480, h = 270;
  const cells = frames.map(({ file, label }) => `<figure><img src="data:image/png;base64,${readFileSync(file).toString('base64')}"><figcaption>${label}</figcaption></figure>`).join('');
  await page.setViewportSize({ width: cols * (w + 8) + 8, height: 600 });
  await page.setContent(`<style>body{margin:0;background:#222;font:14px ui-monospace,monospace;color:#bbb;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:8px;padding:8px}figure{margin:0}img{width:${w}px;height:${h}px;display:block}figcaption{padding:4px 2px}</style>${cells}`);
  await page.screenshot({ path: out, fullPage: true });
}

/** Source text as prose: Markdown markers removed (quotes, bullets, headings, **bold**, `code`), whitespace collapsed. */
export function proseOf(md) {
  return md.replace(/\r/g, '').split('\n')
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*(?:>\s?)+/, '').replace(/^\s*(?:[-*+]|\d+\.)\s+/, ''))
    .join('\n').replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ');
}

/**
 * Exact-text check. Terminal lines must appear character for character in the source; [data-exact] text must
 * appear in its prose (Markdown markers and line breaks do not count). Returns the entries that do not.
 */
export function missingFromSource(entries, md) {
  const raw = md.replace(/\r/g, '');
  const prose = proseOf(md);
  return entries.filter(({ t, term }) => (term ? !raw.includes(t) : !prose.includes(t.replace(/\s+/g, ' ').trim())));
}
