// CodeBlock styling, with the real theme and component CSS (the markup mirrors CodeBlock's output).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { launchBrowser } from '../../scripts/lib.mjs';

const repo = resolve(import.meta.dirname, '../..');
let browser, page;
before(async () => {
  browser = await launchBrowser();
  page = await browser.newPage();
  await page.setContent(`<div class="bd-code"><div class="bd-code-body bd-term">
    <div class="bd-term-line" id="lit"><span class="tk-kw">fun</span> <span class="tk-str">"x"</span></div>
    <div class="bd-term-line dim" id="dim"><span class="tk-kw">fun</span> <span class="tk-str">"x"</span> <span>plain</span></div>
  </div></div>`);
  await page.addStyleTag({ path: `${repo}/themes/neutral.css` });
  await page.addStyleTag({ path: `${repo}/src/beatdeck/styles/components.css` });
  await page.addStyleTag({ content: '*{transition:none!important}' }); // the line colour transitions over 400 ms
});
after(async () => { await browser?.close(); });

const color = (sel) => page.$eval(sel, (e) => getComputedStyle(e).color);

test('a normal line keeps its token colours', async () => {
  assert.notEqual(await color('#lit .tk-kw'), await color('#lit .tk-str'));
});

// A dimmed line used to dim only its plain text: keywords and strings stayed bright.
test('a dimmed line dims its highlighted tokens too', async () => {
  const dim = await color('#dim');
  assert.equal(await color('#dim .tk-kw'), dim);
  assert.equal(await color('#dim .tk-str'), dim);
});

// fitSize assumes a label is label.length * 0.64 * max(18, 0.6 * px) wide and starts 0.1em after its mark: check it
// against what the browser lays out (the mono font here is a system one, so allow a few percent).
test('the label width fit assumes matches the rendered label', async () => {
  const { labelReach } = await import('../../src/beatdeck/components/codefit.ts');
  const label = 'argument of the call';
  const px = 40;
  await page.setContent(`<div class="bd-code"><div class="bd-code-body bd-term" style="font-size:${px}px">
    <div class="bd-term-line"><span class="bd-mk on" id="mk" data-label="${label}">name</span></div></div></div>`);
  await page.addStyleTag({ path: `${repo}/themes/neutral.css` });
  await page.addStyleTag({ path: `${repo}/src/beatdeck/styles/components.css` });
  await page.addStyleTag({ content: '*{transition:none!important}' });
  const rendered = await page.$eval('#mk', (e) => {
    const after = parseFloat(getComputedStyle(e, '::after').width);
    const line = e.parentElement.getBoundingClientRect().left;
    return e.getBoundingClientRect().left - line + 0.1 * parseFloat(getComputedStyle(e).fontSize) + after;
  });
  const estimated = labelReach([{ t: 'name', marks: [{ text: 'name', label }] }], px);
  assert.ok(Math.abs(estimated - rendered) / rendered < 0.06, `estimated ${estimated.toFixed(1)} vs rendered ${rendered.toFixed(1)}`);
});

// A long file name used to push the frame past the fit bound; it now ellipsizes inside maxWidth.
test('a long title stays inside the frame width', async () => {
  await page.setContent(`<div class="bd-code" id="f" style="position:absolute;left:0;top:0;max-width:600px">
    <div class="bd-code-bar"><span class="bd-code-dots"><i></i><i></i><i></i></span>
    <span class="bd-code-file">${'VeryLongFileNameThatKeepsGoing'.repeat(6)}.kt</span></div>
    <div class="bd-code-body bd-term">x</div></div>`);
  await page.addStyleTag({ path: `${repo}/themes/neutral.css` });
  await page.addStyleTag({ path: `${repo}/src/beatdeck/styles/components.css` });
  await page.addStyleTag({ content: '*,*::before,*::after{box-sizing:border-box}' }); // as in stage.css
  const r = await page.evaluate(() => {
    const f = document.querySelector('#f').getBoundingClientRect();
    const t = document.querySelector('.bd-code-file').getBoundingClientRect();
    return { frame: f.width, frameRight: f.right, titleRight: t.right };
  });
  assert.ok(r.frame <= 600, `frame is ${r.frame}px wide`);
  assert.ok(r.titleRight <= r.frameRight, `title ends at ${r.titleRight}, past the frame edge ${r.frameRight}`);
});
