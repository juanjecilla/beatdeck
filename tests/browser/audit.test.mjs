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

// Review round 2 of the frame audit.
const CUT = '<div data-bd-cut style="left:0;top:0;width:1920px;height:1080px;background:#000;opacity:1"></div>';

test('code frame: a frame below an active cut is hidden by it, one above it (Overlay) is still audited', async () => {
  const below = await audit(frame(1500, 300, 800, 300) + CUT);
  assert.ok(!below.errors.some((e) => /code frame/.test(e)), JSON.stringify(below.errors));
  const above = await audit(CUT + frame(1500, 300, 800, 300));
  assert.ok(above.errors.some((e) => /code frame .* outside/.test(e)), JSON.stringify(above.errors));
});
test('code frame: text hidden by a cut does not count as over a frame above it', async () => {
  const r = await audit('<div style="left:340px;top:520px">Hidden by the cut</div>' + CUT + frame(300, 300, 800, 300));
  assert.ok(!r.errors.some((e) => /overlaps the code frame/.test(e)), JSON.stringify(r.errors));
});
test('code frame: an empty chrome layer covering the stage is not chrome; chrome text still is', async () => {
  const empty = '<div data-bd-chrome style="left:0;top:0;width:1920px;height:1080px"><span style="left:0;top:0;width:1920px;height:1080px"></span></div>';
  assert.deepEqual((await audit(frame(300, 300, 800, 300) + empty)).errors, []);
  const title = '<div data-bd-chrome style="left:0;top:0;width:1920px;height:1080px"><span style="left:300px;top:320px">TALK TITLE</span></div>';
  assert.ok((await audit(frame(300, 300, 800, 300) + title)).errors.some((e) => /reaches the deck chrome/.test(e)));
});
test('code frame: the text of another frame over this one is reported, a frame\'s own text is not', async () => {
  const a = frame(300, 300, 800, 300);
  const b = frame(500, 500, 800, 300); // overlaps a; b's text sits in a's blank area
  const r = await audit(a + b);
  assert.ok(r.errors.some((e) => /overlaps the code frame/.test(e)), JSON.stringify(r.errors));
});

// Review round 3 of the frame audit: what counts as deck chrome.
const chromeAt = (inner) => `<div data-bd-chrome style="left:0;top:0;width:1920px;height:1080px">${inner}</div>`;
const F = frame(300, 300, 800, 300);
const reachesChrome = (r) => r.errors.some((e) => /reaches the deck chrome/.test(e));

test('code frame: border-only chrome counts', async () => {
  assert.ok(reachesChrome(await audit(F + chromeAt('<span style="left:320px;top:320px;width:200px;height:60px;border:2px solid #888"></span>'))));
  assert.ok(!reachesChrome(await audit(F + chromeAt('<span style="left:320px;top:320px;width:200px;height:60px;border:2px solid transparent"></span>'))), 'a transparent border is not drawn');
});
test('code frame: a painted chrome element counts even with children; a plain wrapper around text does not widen it', async () => {
  const bar = '<div style="left:320px;top:320px;width:300px;height:60px;background:#ccc"><span style="left:5px;top:5px;width:10px;height:10px"></span></div>';
  assert.ok(reachesChrome(await audit(F + chromeAt(bar))));
  // the title sits far from the frame; its unpainted wrapper spans the stage but is not an obstacle
  const wrapped = '<div style="left:0;top:0;width:1920px;height:1080px"><span style="left:1500px;top:40px">TALK TITLE</span></div>';
  assert.ok(!reachesChrome(await audit(F + chromeAt(wrapped))));
});
test('code frame: a stage-sized painted chrome layer is a backdrop, not an obstacle', async () => {
  assert.ok(!reachesChrome(await audit(F + chromeAt('<div style="left:0;top:0;width:1920px;height:1080px;background:#111"></div>'))));
});
test('code frame: chrome hidden by an active cut does not count; chrome above it does', async () => {
  const tick = '<span style="left:320px;top:320px;width:200px;height:60px;background:#ccc"></span>';
  assert.ok(!reachesChrome(await audit(chromeAt(tick) + CUT + F)), 'chrome before the cut is hidden');
  assert.ok(reachesChrome(await audit(CUT + chromeAt(tick) + F)), 'chrome after the cut is on screen');
});

test('code frame: a 1px chrome rule counts (the size filter must not drop thin chrome)', async () => {
  const rule = '<span style="left:320px;top:450px;width:600px;height:1px;background:#ccc"></span>';
  assert.ok(reachesChrome(await audit(F + chromeAt(rule))));
  const fractional = '<span style="left:320px;top:450px;width:600px;height:0.5px;background:#ccc"></span>';
  assert.ok(reachesChrome(await audit(F + chromeAt(fractional))));
});

test('code frame: a frame inside a border-only outline is not touching it; one crossing the border is', async () => {
  const outline = (x, y, w, h) => chromeAt(`<span style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2px solid #888"></span>`);
  assert.ok(!reachesChrome(await audit(F + outline(200, 200, 1100, 500))), 'frame (300..1100 × 300..600) sits inside the outline');
  assert.ok(reachesChrome(await audit(F + outline(700, 350, 800, 200))), 'the outline\'s left edge crosses the frame');
});

test('code frame: a border scaled up by a chrome transform is as wide as it renders', async () => {
  // a 10px border under scale(2) is 20 stage px; the box renders at (300,300) 640x240, so its left edge is x 300..320 and
  // a frame starting at x 312 (y 350..500, clear of the other edges) touches only the inner half, which an unscaled 10px misses
  const scaled = chromeAt('<div style="left:0;top:0;width:1920px;height:1080px;transform:scale(2);transform-origin:0 0"><span style="left:150px;top:150px;width:300px;height:100px;border:10px solid #888"></span></div>');
  assert.ok(reachesChrome(await audit(frame(312, 350, 200, 150) + scaled)));
  assert.ok(!reachesChrome(await audit(frame(330, 350, 200, 150) + scaled)), 'inside the outline, clear of the 20px edge');
});
test('code frame: a stage-sized border-only outline is still chrome at its edges', async () => {
  const outline = chromeAt('<span style="left:0;top:0;width:1920px;height:1080px;border:4px solid #888"></span>');
  assert.ok(reachesChrome(await audit(frame(2, 300, 800, 300) + outline)), 'the frame crosses the left edge strip');
  assert.ok(!reachesChrome(await audit(F + outline)), 'a frame well inside is not touching it');
});

// Paint order: text drawn over a frame is an error; text behind it is hidden by it (the covered-text warning's job).
test('code frame: text behind the frame is not an overlap error but is reported as covered; text over it is an error', async () => {
  const solid = frame(300, 300, 800, 300).replace('border:1px solid #888', 'border:1px solid #888;background:#123');
  const word = (top) => `<div style="left:340px;top:${top}px">Words under the card</div>`;
  const behind = await audit(word(520) + solid);
  assert.ok(!behind.errors.some((e) => /overlaps the code frame/.test(e)), JSON.stringify(behind.errors));
  assert.ok(behind.covered.length > 0, 'the covered-text warning reports it');
  const over = await audit(solid + word(520));
  assert.ok(over.errors.some((e) => /overlaps the code frame/.test(e)), JSON.stringify(over.errors));
});
test('code frame: the stacking helper leaves no style behind in the page', async () => {
  await audit(frame(300, 300, 800, 300));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('style')].filter((x) => x.textContent === '*{pointer-events:auto!important}').length), 0);
});

test('code frame: a painted or bordered chrome root counts, not only its children', async () => {
  const bar = (css) => `<div data-bd-chrome style="left:0;top:560px;width:1920px;height:80px;${css}"></div>`;
  // the frame (300..1100 × 300..600) reaches y 560..600 of the bar
  assert.ok(reachesChrome(await audit(F + bar('background:#222'))), 'painted root');
  assert.ok(reachesChrome(await audit(F + bar('border-top:3px solid #888'))), 'bordered root: its top edge is at y 560');
  assert.ok(!reachesChrome(await audit(frame(300, 300, 800, 200) + bar('background:#222'))), 'a frame that stops above the bar is clear');
  assert.ok(!reachesChrome(await audit(F + bar(''))), 'an unpainted root is not chrome');
});

test('code frame: a large painted backdrop is not an obstacle, but its visible border is', async () => {
  const backdrop = (border) => chromeAt(`<div style="left:0;top:0;width:1920px;height:1080px;background:#111;${border}"></div>`);
  assert.ok(!reachesChrome(await audit(F + backdrop(''))), 'fill only: a backdrop');
  assert.ok(!reachesChrome(await audit(F + backdrop('border:4px solid #888'))), 'a frame well inside is clear of the border');
  assert.ok(reachesChrome(await audit(frame(2, 300, 800, 300) + backdrop('border:4px solid #888'))), 'a frame crossing the left border strip is reported');
});
