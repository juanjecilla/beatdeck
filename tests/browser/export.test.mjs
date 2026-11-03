// `npm run export` on examples/export-fixture (4 beats, each pinning one behaviour; see its README).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
let out, report;
const run = (script, args) => spawnSync(process.execPath, [join(repo, script), ...args], { cwd: repo, encoding: 'utf8' });

before(() => {
  const b = run('scripts/build.mjs', ['--mode', 'export-fixture']);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  out = mkdtempSync(join(realpathSync(tmpdir()), 'bd-export-'));
  const e = run('scripts/export.mjs', ['dist-export-fixture', out]);
  assert.equal(e.status, 0, e.stdout + e.stderr); // warnings do not fail the run
  report = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
});
after(() => { if (out) rmSync(out, { recursive: true, force: true }); });

const page = (id) => report.pages.find((p) => p.page === id);

test('writes the PDF, one PNG per beat and the report', () => {
  assert.ok(existsSync(join(out, report.file)));
  for (const n of ['01-01', '01-02', '01-03', '01-04']) assert.ok(existsSync(join(out, 'png', `${n}.png`)), n);
  assert.equal(report.pages.length, 4);
});

test('a plain page is vector with no losses', () => {
  assert.equal(page('1.1').mode, 'vector');
  assert.deepEqual(page('1.1').losses, []);
});

// R9: pdf.js drew CSS box-shadow as dark halos and every such page fell back to an image.
test('a large box-shadow stays a vector page', () => {
  assert.equal(page('1.2').mode, 'vector');
  // null would pass `< 1.5` while checking nothing (the print comparison is skipped for ambient motion)
  assert.equal(typeof page('1.2').printDiff, 'number');
  assert.ok(page('1.2').printDiff < 1.5, `printDiff ${page('1.2').printDiff}`);
});

// R10: an infinite animation made the page show one arbitrary moment, silently.
test('an infinite animation is reported as ambient motion', () => {
  assert.ok(page('1.3').losses.some((l) => l.level === 'warning' && /ambient motion/.test(l.text)), JSON.stringify(page('1.3').losses));
});

// R11: ordinary pages differ from the print by <= 0.55 %, backdrop-filter by 5-7 % or more; the threshold is 1.5 %.
test('backdrop-filter falls back to an image page with its text layer', () => {
  assert.equal(page('1.4').mode, 'raster');
  assert.equal(typeof page('1.4').printDiff, 'number');
  assert.ok(page('1.4').printDiff > 1.5, `printDiff ${page('1.4').printDiff}`);
});
