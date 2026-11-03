// Scripts that are both importable (for tests) and runnable must run through a symlinked path too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');

test('changelog-section prints its section when run through a symlinked directory', () => {
  const real = mkdtempSync(join(realpathSync(tmpdir()), 'bd-cs-'));
  const link = real + '-link';
  try {
    mkdirSync(join(real, 'scripts'));
    cpSync(join(repo, 'scripts/changelog-section.mjs'), join(real, 'scripts/changelog-section.mjs'));
    writeFileSync(join(real, 'CHANGELOG.md'), '## 1.2.3\n- hello\n');
    symlinkSync(real, link);
    const r = spawnSync(process.execPath, [join(link, 'scripts/changelog-section.mjs'), '1.2.3', join(link, 'CHANGELOG.md')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), '- hello');
  } finally { rmSync(real, { recursive: true, force: true }); rmSync(link, { force: true }); }
});
