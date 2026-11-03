import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SOURCE_REPO, latestTag, forTalk, writeManifest, ENGINE_FILES } from '../../scripts/upgrade.mjs';

const repo = resolve(import.meta.dirname, '../..');
const tags = (...v) => v.map((x) => `abc123\trefs/tags/${x}`).join('\n');

test('talks upgrade from this fork', () => assert.equal(SOURCE_REPO, 'juanjecilla/beatdeck'));

test('latestTag: highest version, numerically (0.10 > 0.9)', () => assert.equal(latestTag(tags('v0.9.0', 'v0.10.0', 'v0.2.5')), 'v0.10.0'));
test('latestTag: ignores peeled refs, prereleases and non-version tags', () => {
  assert.equal(latestTag(tags('v1.0.0-rc1', 'foo', 'v0.7.0', 'v0.7.0^{}')), 'v0.7.0');
});
test('latestTag: no tags → null (upgrade falls back to main)', () => { assert.equal(latestTag(''), null); assert.equal(latestTag(tags('foo')), null); });

test('forTalk strips examples/templates from tsconfig, leaves other files alone', () => {
  assert.equal(forTalk('tsconfig.json', '{"include":["src","deck", "examples", "templates"]}'), '{"include":["src","deck"]}');
  assert.equal(forTalk('vite.config.ts', 'x, "examples"'), 'x, "examples"');
});

test('manifest records beatdeck\'s own hash, so a file the talk edited still reads as edited next time (0.4.0)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bd-manifest-'));
  try {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(join(dir, ENGINE_FILES[0]), 'user edit');
    writeManifest(dir, '9.9.9', 'main', { [ENGINE_FILES[0]]: 'pristine-hash' });
    const m = JSON.parse(readFileSync(join(dir, '.beatdeck.json'), 'utf8'));
    assert.equal(m.beatdeck, '9.9.9');
    assert.equal(m.files[ENGINE_FILES[0]], 'pristine-hash');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// A talk copied before `init` existed still has .claude-plugin/; only the beatdeck repo itself is refused (0.5.1).
function upgradeIn(name, { viaSymlink = false } = {}) {
  const real = mkdtempSync(join(realpathSync(tmpdir()), 'bd-upgrade-'));
  let dir = real;
  if (viaSymlink) { dir = real + '-link'; symlinkSync(real, dir); }
  mkdirSync(join(dir, 'scripts'));
  cpSync(join(repo, 'scripts/upgrade.mjs'), join(dir, 'scripts/upgrade.mjs'));
  mkdirSync(join(dir, '.claude-plugin'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '0.0.1', scripts: {}, dependencies: {}, devDependencies: {} }));
  const r = spawnSync(process.execPath, [join(dir, 'scripts/upgrade.mjs'), '--from', repo, '--dry-run'], { encoding: 'utf8' });
  rmSync(real, { recursive: true, force: true });
  if (viaSymlink) rmSync(dir, { force: true });
  return r;
}
test('upgrade accepts a pre-init talk that still has .claude-plugin/', () => {
  const r = upgradeIn('my-old-talk');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /dry run/);
});
test('upgrade refuses the beatdeck repo itself', () => {
  const r = upgradeIn('beatdeck');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /beatdeck repo itself/);
});

// A symlinked project path (macOS /tmp → /private/tmp, a linked ~/Documents) made `npm run upgrade` print nothing and
// do nothing: the entrypoint check compared argv[1] with the resolved module URL.
test('upgrade runs when the talk is reached through a symlink', () => {
  const r = upgradeIn('my-old-talk', { viaSymlink: true });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /dry run/);
});
