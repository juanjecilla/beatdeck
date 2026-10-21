/** A deck in two languages: one bundle per locale, the first is the default. */
export const config = {
  /** Language codes. Each needs `i18n/<code>.ts`; `i18n/index.ts` re-exports the first. */
  locales: ['en', 'es'],
  author: 'Ada Lovelace',
  qrUrl: 'TODO',
  qrLabel: '',
  safeMargin: { x: 120, y: 100 } as { x: number; y: number } | false,
} as const;
