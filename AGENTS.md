# beatdeck — agent guide

This repo is the beatdeck engine, a demo talk (`deck/`) and a showcase. Talk projects made from it get their
own AGENTS.md (`templates/talk/AGENTS.md`). If you are building or editing a presentation here, follow the skill
in `skills/building-a-beatdeck/SKILL.md` — it is the full workflow (source → content audit → beat map → scenes →
verification). This file is the short version.

## Layout

| Path | What | Edit? |
| --- | --- | --- |
| `deck/` | **the talk**: `deck.config.ts`, `scenes.ts` (beat map), `timeline.ts`, `index.tsx`, `scenes/` | yes |
| `themes/` | `neutral.css` (default), `light.css` | copy/adjust |
| `src/beatdeck/` | the engine (state, navigation, presenter, overview, debug, stage) | only for generic changes |
| `examples/kernel-panic/` | a full 47-beat production talk, reference only | no |
| `examples/i18n/` | a 7-beat deck in two locales (string tables), reference only | no |
| `skills/building-a-beatdeck/` | the skill + references + `extract_pptx.py` | — |
| `skills/exporting-a-beatdeck/` | the skill for `npm run export` (PDF/PNG) and its loss report | — |
| `templates/` | what `init` puts in a talk: `blank/deck/` (default starter), `talk/AGENTS.md`, `talk/ci.yml` | — |
| `scripts/` | `check-offline.mjs`, `verify.mjs`, `export.mjs` | — |

`src/beatdeck/` never imports from `deck/`. Decks import everything from `'beatdeck'`.

## Commands

```bash
npm run init -- --title "…" --author "…"   # once, in a fresh copy: strips the repo down to a talk
npm run dev            # http://127.0.0.1:5173/#1.1
npm run build          # typecheck + bundle + offline check → dist/
npm run present        # build + local production server
npm run shot -- 3 4.2  # quick frames of some beats while designing → artifacts/shot/
npm run verify         # every beat forwards/back/from URL, compared → artifacts/verify/ (contact.png)
npm run export         # the built talk as PDF + PNGs → artifacts/export/ (--handout, --notes, --variant=all); read skills/exporting-a-beatdeck/SKILL.md
npm run upgrade        # newer beatdeck engine; never touches deck/ (then npm install && npm run verify)
npm run example:kernel-panic
npm run build:i18n && npm run verify:i18n   # the two-locale example (examples/i18n/)
```

## Rules

1. `{ scene, beat }` is the whole state. One click = one beat. Every beat renders from `#s.b` alone.
2. Motion that runs by itself only inside beats marked `auto`: self-contained in a component, or driven by
   `initialLive` + `timeline` in `deck/timeline.ts` when other layers depend on it (see the skill).
3. Fixed 1920×1080 stage. Absolute positions. Nothing responsive inside the stage.
4. Offline: no CDN, remote fonts, APIs or analytics. The build fails otherwise.
5. Content fidelity: never invent quotes, numbers, logos or URLs. Unknowns are explicit `TODO`s.
6. Don't call it done before `npm run build` and `npm run verify` pass and you've looked at `artifacts/verify/contact.png`.

## Reviews

CodeRabbit reviews every non-draft PR into `main` (`.coderabbit.yaml`). With its request-changes workflow it
approves only when its review of the latest commit has completed, all its comments are resolved and the Pre-Merge
Checks pass. The author cannot force that (`allow_author_approval: false`).

1. Fix each comment, or reply on its thread with why not
   (`gh api -X POST repos/{owner}/{repo}/pulls/<n>/comments/<id>/replies -f body=...`).
2. Push all fixes in one commit: it never re-reviews a commit it has already reviewed, and about one review per hour
   is available. Keep other PRs drafts until their turn; a stacked PR is reviewed after it is retargeted to `main`.
3. Comment `@coderabbitai review` if it has not re-reviewed the latest commit. It resolves threads it finds fixed,
   then approves.
4. Merge when CI is green and it has approved. If it is unavailable, an admin merges with `gh pr merge --admin`
   and the PR says so.
