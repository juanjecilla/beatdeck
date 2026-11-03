# export-fixture

Four beats that each pin one behaviour of `npm run export`, used by `tests/browser/export.test.mjs`
(build with `npm run build -- --mode export-fixture`). Not a talk; reference only.

| Beat | What it has | Export must |
| --- | --- | --- |
| 1.1 plain | text on a flat background | vector page, no losses |
| 1.2 shadow | a large CSS `box-shadow` (pdf.js drew it as dark halos) | stay vector |
| 1.3 ambient | an infinite CSS animation | report ambient motion |
| 1.4 blur | `backdrop-filter` over a gradient | fall back to an image page |
