/**
 * Everything that may need changing five minutes before going on stage lives here.
 * After editing, rebuild (`npm run build` / `npm run present`).
 */
export const config = {
  title: 'My talk',
  /** One line under the title. Empty = none. */
  subtitle: '',
  author: '',
  /** Destination of the QR on the closing screen. "TODO" = no QR (the presenter view warns). Never guess it. */
  qrUrl: 'TODO',
  /** Shown under the QR, e.g. "example.com/talk". */
  qrLabel: '',
  /** Layout audit: warn when text sits closer than this (stage px) to an edge. `false` = off. */
  safeMargin: { x: 120, y: 100 } as { x: number; y: number } | false,
} as const;
