# Solved errors and the tests that keep them solved

Every bug fixed in beatdeck gets a row here and a test that fails without the fix. Run them with `npm test`
(pure functions, no browser) and `npm run test:browser` (headless Chromium: dev server, hand-made stages).
**Status** is `test` (automated), `static guard` (reads the source of a fix that cannot run here), `verify` (caught by `npm run verify` on the demo, no isolated test) or `TODO`
(solved, not yet guarded: say so rather than pretend).

| # | Version | Symptom | Cause → fix | Status |
| --- | --- | --- | --- | --- |
| R1 | 0.3.0 | `µ` and `ß` rendered as other letters in uppercase headings | CSS `text-transform: uppercase` → `.keep-case`; `verify` fails on it | verify |
| R2 | 0.4.0 | `upgrade` marked a talk's own edits as pristine | manifest hashed the talk's file → it records beatdeck's hash (`pristine`) | test `tests/unit/upgrade.test.mjs` |
| R3 | 0.5.0 | `init`/`upgrade` crashed on Windows paths with non-ASCII characters (Node 24) | `fs.cpSync` → manual copy | static guard `tests/unit/guards.test.mjs` (no `cpSync` in `scripts/`); not run on Windows |
| R4 | 0.5.0 | Quotes from the source failed the exact-text check over Markdown markers and line breaks | compare `data-exact` as prose, Terminal lines verbatim → `proseOf`, `missingFromSource` | test `tests/unit/source-text.test.mjs` |
| R5 | 0.5.1 | `upgrade` refused talks copied before `init` existed (they still had `.claude-plugin/`) | refuse only the package named `beatdeck` | test `tests/unit/upgrade.test.mjs` |
| R6 | 0.6.0 | `upgrade` left the old default `build` script in place, or overwrote an edited one | `PREVIOUS_SCRIPTS`: replace only the known old default | test `tests/unit/upgrade.test.mjs` |
| R7 | 0.6.1 | text covered by a card, image or painted shape went unnoticed; empty layers, `<svg>`/`<canvas>` boxes and `data-audit="off"` must not warn | covered-text audit with exemptions | test `tests/browser/audit.test.mjs` |
| R8 | 0.6.1 | text too close to the stage edge; overlapping text | safe-margin audit, overlap errors | test `tests/browser/audit.test.mjs` |
| R9 | 0.7.0 | pdf.js drew CSS `box-shadow` as dark halos, so light-theme pages looked broken and fell back to raster | export checks pages with PDFium, ADR 0002 | test `tests/browser/export.test.mjs` (fixture beat 1.2) |
| R10 | 0.7.0 | ambient (infinite) animation made the export capture an arbitrary moment | `settle()` ignores infinite animations; two shots 400 ms apart compared (kernel-panic 4.4) | test `tests/browser/export.test.mjs` (fixture beat 1.3) |
| R11 | 0.7.0 | `--diff` threshold: ordinary pages differ from the print by ≤ 0.55 %, `backdrop-filter`/`mix-blend-mode` by 5–7 % | single threshold of 1.5 % | test `tests/browser/export.test.mjs` (fixture beat 1.4) |
| R12 | 0.7.1 | presenter window crashed on the dev server: `BroadcastChannel: Channel is closed` | channel opened once in `useMemo`, closed by the first StrictMode effect cleanup → opened inside the effect | test `tests/browser/presenter.test.mjs` |
| R13 | 0.7.1 | `npm run upgrade` printed nothing and did nothing when the project path was a symlink | entrypoint check compared `argv[1]` with the resolved module URL → compare real paths | test `tests/unit/upgrade.test.mjs`, `tests/unit/entrypoint.test.mjs` |
| R14 | 0.6.1 | a release tag without a GitHub Release could never be completed on rerun | `release.yml` checked the tag only → tag and Release checked apart; empty changelog section refused | test `tests/unit/changelog-section.test.mjs` (notes); the guards in `tests/unit/guards.test.mjs` pin tag-only-from-main and notes-before-tag; the workflow itself ran for v0.6.1 and v0.7.0 |
| R15 | 0.6.1 | `upstream-sync` merged the wrong commit (a later `git fetch` overwrote `FETCH_HEAD`) and could force-push over reviewers' commits | upstream SHA saved right after the fetch; no force-push while a sync PR is open | static guard `tests/unit/guards.test.mjs`; the workflow itself runs only on its schedule |
| R16 | 0.6.1 | `upgrade` default tag could select a release whose own `upgrade.mjs` pointed at another repo | `latestTag` + the 0.6.1 release carrying the new script | test `tests/unit/upgrade.test.mjs` (`latestTag`) |
| R17 | 0.7.0 | one page that failed to capture crashed the export report (`undefined.toFixed`): no `report.json`, remaining variants not run | failed-capture result had no `printDiff` → `printDiff: null`, report treats `== null` | test `tests/unit/export-report.test.mjs` (`failedPage`, `reportPage`) |
| R18 | 0.7.1 | a new talk inherited `release.yml`, `upstream-sync.yml`, `tests/` and the repo's `test` scripts | `init` removes them; `upgrade` never adds `test*` scripts | CI `scaffold` job asserts it |
| R19 | 0.7.0 | `upgrade` overwrote or removed an engine file it had no recorded hash for (a dir added by a newer beatdeck) without a backup | no hash counted as unedited → counts as edited | test `tests/unit/upgrade.test.mjs` |

## Adding a row
1. Write the test first and watch it fail for the reason in **Symptom**.
2. Fix; the test passes.
3. Add the row (next `R<n>`), with the version it ships in.
