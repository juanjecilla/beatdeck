import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proseOf, missingFromSource } from '../../scripts/lib.mjs';

test('proseOf drops Markdown markers and collapses whitespace', () => {
  assert.equal(proseOf('# Title\n> a **bold** `code`\n- item\n1. two'), 'Title a bold code item two');
});
test('data-exact text is compared as prose: markers and line breaks do not count (0.5.0)', () => {
  const md = '> "Fear is the **mind-killer**\n> and more."';
  assert.deepEqual(missingFromSource([{ t: '"Fear is the mind-killer and more."', term: false }], md), []);
});
test('an invented or altered quote is reported', () => {
  const md = 'The real quote.';
  assert.equal(missingFromSource([{ t: 'A different quote.', term: false }], md).length, 1);
});
test('Terminal lines must match the source verbatim, markers included', () => {
  const md = '$ npm run **build**';
  assert.equal(missingFromSource([{ t: '$ npm run build', term: true }], md).length, 1);
  assert.equal(missingFromSource([{ t: '$ npm run **build**', term: true }], md).length, 0);
});
