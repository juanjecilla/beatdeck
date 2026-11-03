/**
 * Everything that may need changing five minutes before going on stage lives here.
 * After editing, rebuild (`npm run build` / `npm run present`).
 */
export const config = {
  title: 'beatdeck',
  subtitle: 'talks as beats, not slides',
  author: 'Borja Pérez Francés',
  /** Destination of the QR on the closing screen. "TODO" = no QR (the presenter view warns). Never guess it. */
  qrUrl: 'https://github.com/juanjecilla/beatdeck',
  /** Shown under the QR. */
  qrLabel: 'github.com/juanjecilla/beatdeck',
  scaffold: 'npx degit juanjecilla/beatdeck my-talk',
  /** Layout audit: warn when text sits closer than this (stage px) to an edge. `false` = off. */
  safeMargin: { x: 120, y: 100 } as { x: number; y: number } | false,
} as const;
