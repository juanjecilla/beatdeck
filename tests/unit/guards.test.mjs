// Static guards for fixes that cannot run in a unit test (another OS, a GitHub runner). They read the source and
// fail if the fixed pattern comes back. The workflows themselves are only exercised by their triggers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const read = (f) => readFileSync(join(repo, f), 'utf8');

// R3: fs.cpSync fails on Windows paths with non-ASCII characters in Node 24.
test('scripts never use fs.cpSync', () => {
  for (const f of readdirSync(join(repo, 'scripts')).filter((x) => x.endsWith('.mjs'))) {
    assert.doesNotMatch(read(`scripts/${f}`), /\bcpSync\s*\(/, `scripts/${f} uses cpSync`);
  }
});

// R15: a later `git fetch` overwrote FETCH_HEAD (the merge took the wrong commit); a failed PR lookup took the
// force-push path; upstream tags were imported into the fork.
test('upstream-sync keeps the upstream SHA, never force-pushes over an open sync PR, fetches without tags', () => {
  const y = read('.github/workflows/upstream-sync.yml');
  assert.match(y, /upstream_sha=\$\(git rev-parse FETCH_HEAD\)/);
  assert.match(y, /git merge --no-edit "\$upstream_sha"/);
  assert.doesNotMatch(y, /git merge --no-edit FETCH_HEAD/);
  assert.match(y, /git fetch --no-tags upstream/);
  assert.doesNotMatch(y, /git fetch --tags/);
  assert.match(y, /"true" \][\s\S]*?git push origin sync\/upstream[\s\S]*?else[\s\S]*?git push --force origin sync\/upstream/);
});

// R14: tag only from main, notes validated before the tag exists, tag and Release checked apart.
test('release workflow tags only from main and validates the notes before tagging', () => {
  const y = read('.github/workflows/release.yml');
  assert.match(y, /if: github\.ref == 'refs\/heads\/main'/);
  const notes = y.indexOf('changelog-section.mjs "${version}" > notes.md', y.indexOf('else'));
  const tag = y.indexOf('git tag -a');
  assert.ok(notes > 0 && tag > notes, 'notes are generated before git tag');
  assert.match(y, /gh release view/);
});
