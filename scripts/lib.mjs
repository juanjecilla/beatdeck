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
export { auditFrame } from '../src/beatdeck/audit.js';

/** Locales of a multi-locale build (`<dist>/locales.json`, written by scripts/build.mjs), else null. */
export function builtLocales(dist) {
  try { return JSON.parse(readFileSync(`${dist}/locales.json`, 'utf8')).locales; } catch { return null; }
}

/** Covered-text entries from auditFrame as warning lines. */
export const coveredWarnings = (covered) => covered.map((c) => `${c.t} is covered by ${c.by} (add data-audit="off" to the covering element if intended)`);

/** Safe-area entries from auditFrame as warning lines. */
export const edgeWarnings = (edges) => edges.map((e) => `${e.t} is ${e.d} px from the ${e.edge} edge (safe margin ${e.m})`);

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
