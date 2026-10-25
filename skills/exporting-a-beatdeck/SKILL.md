---
name: exporting-a-beatdeck
description: Exports a beatdeck talk as a PDF and PNGs (one page per beat, or per scene as a handout) with npm run export, and fixes what a still page loses - auto beats, frames that never settle, ambient motion, covered text, a live theme switch. Use when the task is to hand out, attach, print or share a beatdeck talk as PDF or images, to make a beat exportable, or to read an export report.
license: MIT
---

# Exporting a beatdeck

`npm run export` turns each beat's settled frame into a vector PDF and a folder of PNGs. A still page cannot keep
motion or a live switch, so the export also reports, per page, what it loses. The job is to export and to leave no
unexplained loss.

**Paths.** `references/…` is relative to this SKILL.md. `npm run …`, `deck/` and `artifacts/` are relative to the
deck project. The export reads `dist/`, so a stale build exports a stale talk.

## 1 · Prove the talk first

`npm run build && npm run verify`. An export of a talk that does not verify only copies its problems into a PDF.

## 2 · Export

```bash
npm run export                     # every beat → artifacts/export/<deck-id>.pdf + png/SS-BB.png + report.json
npm run export -- --handout        # one page per scene: its last beat
npm run export -- --notes          # beat notes under each page (handout: the notes of the scene's beats)
npm run export -- --variant=all    # every declared variant, each in its own folder (see step 4)
```

A multi-locale build exports once per locale into `artifacts/export/<locale>/`. Choose per-beat for a complete
copy and `--handout` for people who read along; add `--notes` only when the speaker wants them printed.

## 3 · Read the loss report

The run prints one line per loss: `<scene>.<beat> ⚠ <what>`. **Errors** (text overlap, text outside the stage) fail
the run; **warnings** do not, unless `--strict`. Take each line to one of the cases in
[`references/export-loss.md`](references/export-loss.md), which gives the cause and the fix for every case.

Done when the run exits 0 and every warning left is either fixed or named to the speaker with its page, in one
line each. The speaker decides whether an accepted loss (an `auto` beat's motion, say) is fine on paper.

## 4 · Variants

A look the speaker switches live (dark/light on a key) is a **variant**. Declare it in `defineDeck` so the export can
pin it:

```ts
variants: { theme: { attr: 'data-theme', values: ['dark', 'light'], default: 'dark' } },
```

`attr` is the attribute the deck sets on `<html>`. The export reports any other `<html>` attribute the deck sets
at load ("declare it in variants"): turn each into a declared variant, or confirm to the speaker that it does not
change the look. Export the default for the main copy; `--variant=theme=light` or `--variant=all` for the others.

## 5 · Look at the pages

Open `artifacts/export/png/` (or the PDF) and check the pages named in the report, the first page of each scene, and
one page per variant. `report.json` marks pages that became an image with an invisible text layer
(`"mode": "raster"`): look at those first, since the print got them wrong.
