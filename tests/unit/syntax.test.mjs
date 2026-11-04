// CodeBlock's highlighter (src/beatdeck/components/syntax.ts, plain TypeScript: Node strips the types).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../../src/beatdeck/components/syntax.ts';
import { columns, fitSize } from '../../src/beatdeck/components/codefit.ts';

const kinds = (toks) => toks.map((t) => `${t.k}:${t.s}`);
const text = (toks) => toks.map((t) => t.s).join('');

test('highlighting never changes a character, in any language', () => {
  const samples = {
    kotlin: ['/** doc @param x */', 'fun f(x: Int = 0x1F): String { return "a\\"b" } // end', '/* open', 'still */ val y = 1'],
    xml: ['<a b="1" c=\'2\'>', '  <string name="s">don\'t "quote"</string>', '<x y="multi', 'line"/>'],
    json: ['{ "a": [1, -2.5, true, null], "b": "x\\"y" }'],
    term: ['$ echo "a $HOME" --flag \\', '  more', 'Error: failed', 'key: value', '$ ls | grep x; echo $?'],
  };
  for (const [lang, lines] of Object.entries(samples)) {
    tokenize(lines, lang).forEach((toks, i) => assert.equal(text(toks), lines[i], `${lang} line ${i}`));
  }
});

// A tab advances to the next 4-column stop (the CSS tab-size), so fit must count it that way.
test('columns counts tabs to the next 4-column stop', () => {
  assert.equal(columns('abc'), 3);
  assert.equal(columns('\t'), 4);
  assert.equal(columns('a\tb'), 5);
  assert.equal(columns('\t'.repeat(18) + 'X'), 73);
});

// A single-quoted XML attribute value containing a double quote must not open a string that runs on.
test('xml: single-quoted attribute values close on their own quote', () => {
  const [tag, next] = tokenize(['<a b=\'say "hi"\'>', '<c d="x"/>'], 'xml');
  assert.deepEqual(kinds(tag).filter((k) => k.startsWith('str')), ['str:\'say "hi"\'']);
  assert.deepEqual(kinds(next), ['tag:<c', 'plain: ', 'attr:d', 'plain:=', 'str:"x"', 'tag:/>']);
});
test('xml: a multi-line value only closes on the quote that opened it', () => {
  const lines = tokenize(['<a b="it\'s', 'still the value" c=\'d\'>'], 'xml');
  assert.deepEqual(kinds(lines[1]).slice(0, 1), ['str:still the value"']);
});
test('xml: quotes in text content are plain text', () => {
  const [toks] = tokenize(['<s>don\'t say "hi"</s>'], 'xml');
  assert.ok(toks.every((t) => t.k !== 'str'), kinds(toks).join(' | '));
});

// After an `Error:` block, a new `$ ` command's output is not error-coloured.
test('term: a new command ends the error colouring', () => {
  const rows = tokenize(['$ false', 'Error: failed', 'detail line', '$ echo ok', 'ok'], 'term');
  assert.equal(rows[2][0].k, 'err');
  assert.ok(rows[4].every((t) => t.k !== 'err'), kinds(rows[4]).join(' | '));
});

// `fit` sizes the font so the block stays inside the right bound. R20: it counted a tab as one column.
const bounds = { right: 1790, bottom: 975 };
const fit = (lines, size = 60, f = { x: 150, y: 200 }) => fitSize(lines, size, f, bounds);

test('fit: a tabbed line fits like its tab-expanded equivalent', () => {
  const tabbed = [{ t: '\t'.repeat(18) + 'X' }];
  const spaces = [{ t: ' '.repeat(72) + 'X' }]; // 18 tabs of 4 columns, then X
  assert.equal(fit(tabbed), fit(spaces));
  assert.ok(fit(tabbed) < fit([{ t: 'X'.repeat(19) }]), 'tabs take more room than one column each');
});
test('fit: the frame ends inside the right bound', () => {
  const lines = [{ t: '\t'.repeat(18) + 'X' }];
  const px = fit(lines);
  assert.ok(150 + 80 + 2 + 73 * 0.6 * px <= 1790 || px === 20);
});

// A long mark label hangs off the line: the font shrinks until it is inside the bound too.
test('fit: a long label is included, enabled or not (the size must not change between beats)', () => {
  const plain = [{ t: 'val x = 1' }];
  const labelled = [{ t: 'val x = 1', labels: 1, marks: [{ text: 'x', label: 'a very long label that runs far to the right of the code and well past any sensible bound for it' }] }];
  assert.ok(fit(labelled) < fit(plain));
  const off = [{ ...labelled[0], marks: [{ ...labelled[0].marks[0], on: false }] }];
  assert.equal(fit(off), fit(labelled));
});
test('fit: a short label changes nothing; a missing mark does not throw here', () => {
  const plain = [{ t: 'val x = 1' }];
  assert.equal(fit([{ t: 'val x = 1', labels: 1, marks: [{ text: 'x', label: 'ok' }] }]), fit(plain));
  assert.doesNotThrow(() => fit([{ t: 'a', marks: [{ text: 'zzz', label: 'q' }] }]));
});
