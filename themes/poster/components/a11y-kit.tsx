import { useEffect } from 'react';
import { deck, usePos } from 'beatdeck';

/*
 * A small accessibility kit for beatdeck decks. Independent of the theme: it works with any of them.
 *
 * Why it exists: a beatdeck keeps every scene layer mounted and hides the others with `opacity`, which hides nothing
 * from assistive technology. A screen reader on the raw deck reads every scene at once, and nothing can be focused,
 * so a keyboard- or switch-only visitor cannot advance. The kit gives it one live announcement per beat, real
 * Previous/Next buttons, and hides the pictures.
 *
 * Stage = (
 *   <>
 *     <ThemeToggle />
 *     <LiveRegion summaries={SR} />
 *     <SrNav />
 *     <StagePicture> …every scene layer… </StagePicture>
 *   </>
 * )
 */

type Edition = 'day' | 'dark';
const KEY = 'beatdeck-edition';

const stored = (): Edition | null => {
  try { const v = localStorage.getItem(KEY); return v === 'day' || v === 'dark' ? v : null; } catch { return null; }
};
const preferred = (): Edition => (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'day');
const apply = (e: Edition) => { if (e === 'dark') document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme; };

// Applied at import, before the first frame, so the stage never flashes the wrong edition.
apply(stored() ?? preferred());

/** Key T flips day ↔ dark. Remembered per browser; works without storage (private windows, blocked storage). */
export function ThemeToggle() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 't' && e.key !== 'T') || e.metaKey || e.ctrlKey || e.altKey) return;
      const next: Edition = document.documentElement.dataset.theme === 'dark' ? 'day' : 'dark';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch { /* storage may be blocked: the toggle still works */ }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

const hidden = {
  position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, fontSize: 18,
} as const;

/** Hides the stage's pictures from assistive tech. `display: contents` leaves the layers' absolute layout untouched. */
export function StagePicture({ children }: { children: React.ReactNode }) {
  return <div aria-hidden="true" style={{ display: 'contents' }}>{children}</div>;
}

/**
 * Announces each beat. `summaries` maps `<scene id>.<beat name>` to a short text equivalent of what is on screen
 * (never the speaker notes: those are private). A beat without an entry falls back to "<scene title>, <beat name>"
 * and is marked data-source="fallback", so a test can fail on it.
 */
export function LiveRegion({ summaries }: { summaries: Record<string, string> }) {
  const { s, b } = usePos();
  const scene = deck.scenes[s];
  const beat = scene?.beats[b];
  const authored = scene && beat ? summaries[`${scene.id}.${beat.name}`] : undefined;
  const text = scene && beat ? (authored ?? `${scene.title}, ${beat.name}`) : '';
  const where = scene && beat ? ` Scene ${scene.id}, step ${b + 1} of ${scene.beats.length}.` : '';
  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-audit="off" data-source={authored ? 'sr' : 'fallback'} style={hidden}>
      {text}
      {where}
    </div>
  );
}

/**
 * Previous/Next as real buttons: invisible until they have keyboard focus (then they appear bottom-left).
 * `stopPropagation`: the stage advances on any click, and one press must be one step.
 */
export function SrNav() {
  const press = (go: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); go(); };
  return (
    <div className="sr-nav" data-audit="off">
      <button type="button" onClick={press(() => deck.prev())}>Previous step</button>
      <button type="button" onClick={press(() => deck.next())}>Next step</button>
    </div>
  );
}
