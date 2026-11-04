// The frame audit (used by verify, shot, export and the dev badge) on hand-made stages.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, auditFrame } from '../../scripts/lib.mjs';

let browser, page;
before(async () => { browser = await launchBrowser(); page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); });
after(async () => { await browser?.close(); });

const stage = (inner, margin) => page.setContent(`<style>body{margin:0}.stage{position:relative;width:1920px;height:1080px;font:40px sans-serif}
  .stage *{position:absolute}</style><script>window.__beatdeck=${JSON.stringify(margin === undefined ? {} : { audit: { safeMargin: margin } })}</script>
  <div class="stage">${inner}</div>`);
const audit = async (inner, margin) => { await stage(inner, margin); return page.evaluate(auditFrame); };
const TEXT = '<div style="left:400px;top:400px;width:600px">Visible words here</div>';

test('baseline: plain text has no findings', async () => {
  const r = await audit(TEXT);
  assert.deepEqual([r.errors, r.covered, r.edges], [[], [], []]);
});
test('a card painted on top of text is reported as covered', async () => {
  const r = await audit(TEXT + '<div style="left:380px;top:380px;width:700px;height:120px;background:#123"></div>');
  assert.equal(r.covered.length, 1);
});
test('an empty layer on top of text is not a cover', async () => {
  assert.deepEqual((await audit(TEXT + '<div style="left:0;top:0;width:1920px;height:1080px"></div>')).covered, []);
});
test('an <svg> box on top of text is not a cover', async () => {
  assert.deepEqual((await audit(TEXT + '<svg style="left:0;top:0" width="1920" height="1080"></svg>')).covered, []);
});
test('data-audit="off" silences a cover', async () => {
  const r = await audit(TEXT + '<div data-audit="off" style="left:380px;top:380px;width:700px;height:120px;background:#123"></div>');
  assert.deepEqual(r.covered, []);
});
test('overlapping text is an error', async () => {
  const r = await audit('<div style="left:400px;top:400px">First line of words</div><div style="left:410px;top:410px">Second line of words</div>');
  assert.ok(r.errors.length > 0);
});
test('text closer than the safe margin to an edge is a warning; far from it is not', async () => {
  const near = await audit('<div style="left:20px;top:400px">At the edge</div>', { x: 120, y: 100 });
  assert.ok(near.edges.length > 0);
  const far = await audit(TEXT, { x: 120, y: 100 });
  assert.deepEqual(far.edges, []);
});

// CodeBlock frames (.bd-code) are audited as objects.
const frame = (x, y, w, h, extra = '') =>
  `<div class="bd-code" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:1px solid #888">
     <span class="bd-code-file" style="position:static">Greeter.kt</span>
     <div style="left:20px;top:60px">fun greet()</div>${extra}</div>`;

test('code frame: a frame well inside the stage has no findings (its own text is not "over" it)', async () => {
  const r = await audit(frame(300, 300, 800, 300), { x: 120, y: 100 });
  assert.deepEqual([r.errors, r.edges], [[], []]);
});
test('code frame: text drawn over a frame is an error (a caption under a block that grew)', async () => {
  const r = await audit(frame(300, 300, 800, 300) + '<div style="left:340px;top:520px">Caption placed too high</div>');
  assert.ok(r.errors.some((e) => /overlaps the code frame/.test(e)), JSON.stringify(r.errors));
});
test('code frame: a frame outside the stage is an error', async () => {
  const r = await audit(frame(1500, 300, 800, 300));
  assert.ok(r.errors.some((e) => /outside the 1920×1080 stage/.test(e)), JSON.stringify(r.errors));
});
test('code frame: a frame reaching the deck chrome is an error', async () => {
  const chrome = '<div data-bd-chrome style="left:0;top:1000px;width:1920px;height:60px"><span style="left:100px;top:10px;width:300px;height:30px;background:#ccc"></span></div>';
  const r = await audit(frame(300, 700, 800, 340) + chrome);
  assert.ok(r.errors.some((e) => /reaches the deck chrome/.test(e)), JSON.stringify(r.errors));
});
test('code frame: closer than the safe margin to an edge is a warning, not an error', async () => {
  const r = await audit(frame(40, 300, 800, 300), { x: 120, y: 100 });
  assert.deepEqual(r.errors, []);
  assert.ok(r.edges.some((e) => e.t.startsWith('code frame') && e.edge === 'left'), JSON.stringify(r.edges));
});
