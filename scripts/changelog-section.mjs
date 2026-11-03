#!/usr/bin/env node
// Prints the CHANGELOG.md section of one version, for the GitHub Release notes.
//   node scripts/changelog-section.mjs 0.7.0 [CHANGELOG.md]
// Exits 1 when the version has no section, so a release never goes out with empty notes.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The text under `## <version>` up to the next `## ` heading, trimmed; null if there is no such section. */
export function changelogSection(markdown, version) {
  const lines = String(markdown).split('\n');
  const heading = (l) => /^##\s+/.test(l);
  const start = lines.findIndex((l) => heading(l) && l.replace(/^##\s+/, '').trim().replace(/^v/, '') === version.replace(/^v/, ''));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && heading(l));
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end).join('\n').trim();
  return body || null;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const [version, file = 'CHANGELOG.md'] = process.argv.slice(2);
  if (!version) { console.error('usage: changelog-section.mjs <version> [CHANGELOG.md]'); process.exit(2); }
  const body = changelogSection(readFileSync(file, 'utf8'), version);
  if (!body) { console.error(`${file}: no section for ${version}`); process.exit(1); }
  console.log(body);
}
