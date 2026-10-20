# One bundle per locale, chosen at build time

A deck in several languages keeps one beat map and one layout, with a typed string table per locale (`deck/i18n/<locale>.ts`) imported through `deck/i18n/index.ts`. `npm run build` builds each locale separately (`BEATDECK_LOCALE`), redirecting that index to the locale's table, so a bundle ships one language and `verify` and `shot` run per locale.

Considered and rejected: a runtime `?lang=` switch (puts state outside `#scene.beat`, so a beat no longer renders from the URL alone, and it ships every language to every audience), a `t('key')` helper (string keys lose type checking and readability in scene files), and a copied deck per language (the late-change-applied-twice problem this replaces).

The first entry of `locales` is the default for dev and `shot`; `i18n/index.ts` must re-export it, and the build fails if it does not. Scene ids, scene titles and beat names stay shared on purpose (the operator's vocabulary, the same in every locale, and what the presenter view and overview show, all engine UI in English); only text on stage, beat notes and the deck title are localized.
