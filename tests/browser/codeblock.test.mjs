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
