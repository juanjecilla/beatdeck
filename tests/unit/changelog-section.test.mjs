import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changelogSection } from '../../scripts/changelog-section.mjs';

const md = '# Changelog\n\n## 0.7.0\n- b\n- c\n\n## 0.6.1\n- a\n\n## 0.6.0\n- old\n';

test('returns only the requested version, trimmed', () => {
  assert.equal(changelogSection(md, '0.6.1'), '- a');
  assert.equal(changelogSection(md, '0.7.0'), '- b\n- c');
});
test('last section runs to the end of the file', () => assert.equal(changelogSection(md, '0.6.0'), '- old'));
test('accepts a v prefix on either side', () => {
  assert.equal(changelogSection(md.replace('## 0.6.1', '## v0.6.1'), '0.6.1'), '- a');
  assert.equal(changelogSection(md, 'v0.6.1'), '- a');
});
test('missing or empty section is null, so a release never goes out with empty notes', () => {
  assert.equal(changelogSection(md, '9.9.9'), null);
  assert.equal(changelogSection('## 1.0.0\n\n## 0.9.0\n- x', '1.0.0'), null);
});
test('0.6 does not match 0.6.1 (exact heading)', () => assert.equal(changelogSection(md, '0.6'), null));
