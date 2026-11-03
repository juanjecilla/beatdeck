// Regression: the presenter window crashed on the dev server ("BroadcastChannel: Channel is closed").
// StrictMode mounts effects twice; the channel was created once and closed by the first cleanup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, startServer, sleep } from '../../scripts/lib.mjs';

let srv, browser;
before(async () => { srv = await startServer({ dev: true, port: 4291 }); browser = await launchBrowser(); });
after(async () => { await browser?.close(); srv?.stop(); });

test('presenter view mounts on the dev server without errors', async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${srv.base}?view=presenter`);
  await sleep(2000);
  assert.deepEqual(errors, []);
  assert.ok(await page.locator('text=resync').count(), 'presenter UI rendered');
});

test('presenter follows the stage and sends commands', async () => {
  // BroadcastChannel only reaches pages of the same browser context
  const ctx = await browser.newContext();
  const stage = await ctx.newPage();
  await stage.goto(`${srv.base}#1.1`);
  const presenter = await ctx.newPage();
  await presenter.goto(`${srv.base}?view=presenter`);
  await sleep(1500);
  await presenter.bringToFront();
  await presenter.keyboard.press('ArrowRight');
  await sleep(800);
  assert.equal(new URL(stage.url()).hash, '#1.2', 'stage moved one beat after a command from the presenter');
});
