// CodeBlock's highlighter (src/beatdeck/components/syntax.ts, plain TypeScript: Node strips the types).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columns, tokenize } from '../../src/beatdeck/components/syntax.ts';

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
