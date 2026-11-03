// Regression: the presenter window crashed on the dev server ("BroadcastChannel: Channel is closed").
// StrictMode mounts effects twice; the channel was created once and closed by the first cleanup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, startServer } from '../../scripts/lib.mjs';

let srv, browser;
before(async () => { srv = await startServer({ dev: true, port: 4291 }); browser = await launchBrowser(); });
after(async () => { await browser?.close(); srv?.stop(); });

test('presenter view mounts on the dev server without errors', async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${srv.base}?view=presenter`);
  await page.getByText('resync').waitFor({ timeout: 15000 }); // rendered (fonts may delay mount)
  await page.waitForTimeout(500); // let an effect-time error surface
  assert.deepEqual(errors, []);
});

test('presenter follows the stage and sends commands', async () => {
  // BroadcastChannel only reaches pages of the same browser context
  const ctx = await browser.newContext();
  const stage = await ctx.newPage();
  // scene 2 has no `auto` beat: #1.2 advances itself, which would make the final wait racy
  await stage.goto(`${srv.base}#2.1`);
  const presenter = await ctx.newPage();
  await presenter.goto(`${srv.base}?view=presenter`);
  // only press once the presenter says it hears the stage: an earlier key would be lost, not queued
  await presenter.getByText('stage connected').waitFor({ timeout: 15000 });
  await presenter.bringToFront();
  await presenter.keyboard.press('ArrowRight');
  await stage.waitForFunction(() => location.hash === '#2.2', null, { timeout: 5000 });
});
