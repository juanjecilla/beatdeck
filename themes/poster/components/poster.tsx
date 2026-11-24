import { useEffect } from 'react';
import { Reveal, Terminal, deck, usePos, type TermLine } from 'beatdeck';

/** A cream sheet with a hard shadow: where code, tool output and screenshots live, whatever the tone. */
export function Sheet({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="sheet" style={style}>{children}</div>;
}

/** A screenshot (or any image) on a sheet. `alt` is required on purpose. */
export function Shot({ on, out, src, alt, x, y, h = 760, caption }: {
  on: boolean; out?: boolean; src: string; alt: string; x: number; y: number; h?: number; caption?: string;
}) {
  return (
    <Reveal on={on} out={out} x={x} y={y}>
      <Sheet style={{ padding: 14 }}>
        <figure style={{ margin: 0 }}>
          <img src={src} alt={alt} style={{ height: h - 28 }} />
          {caption && <figcaption className="t-meta" style={{ fontSize: 22, marginTop: 12, textTransform: 'none', letterSpacing: '0.02em' }}>{caption}</figcaption>}
        </figure>
      </Sheet>
    </Reveal>
  );
}

/** Code or terminal output, character-exact (beatdeck's Terminal), on a sheet. */
export function Mono({ on, out, x, y, lines, size = 30, width }: {
  on: boolean; out?: boolean; x: number; y: number; lines: (string | TermLine)[]; size?: number; width?: number;
}) {
  return (
    <Reveal on={on} out={out} x={x} y={y}>
      <Sheet><Terminal lines={lines} size={size} width={width} /></Sheet>
    </Reveal>
  );
}

/** The opening of a section: a huge title and a line under it, on the scene's tone. */
export function BigTitle({ on, out, title, line, x = 150, y = 300 }: {
  on: boolean; out?: boolean; title: string; line?: string; x?: number; y?: number;
}) {
  return (
    <>
      <Reveal on={on} out={out} x={x} y={y}>
        <div className="t-statement" style={{ fontSize: 300 }}>{title}</div>
      </Reveal>
      {line && (
        <Reveal on={on} out={out} x={x + 8} y={y + 350} delay={200}>
          <div style={{ width: 220, height: 14, background: 'var(--ink)', marginBottom: 36 }} />
          <div className="t-editorial" style={{ fontSize: 66, maxWidth: 1300 }}>{line}</div>
        </Reveal>
      )}
    </>
  );
}

/** A small stamped label above the content of a beat. */
export function Stamp({ on, out, text, x = 150, y = 92 }: { on: boolean; out?: boolean; text: string; x?: number; y?: number }) {
  return (
    <Reveal on={on} out={out} x={x} y={y}>
      <span className="t-eyebrow" style={{ border: '3px solid var(--ink)', borderRadius: 999, padding: '8px 24px', display: 'inline-block' }}>{text}</span>
    </Reveal>
  );
}

/** One sentence that carries the beat. */
export function Say({ on, out, text, x = 150, y = 190, size = 84, color }: {
  on: boolean; out?: boolean; text: string; x?: number; y?: number; size?: number; color?: string;
}) {
  return (
    <Reveal on={on} out={out} x={x} y={y}>
      <div className="t-statement" style={{ fontSize: size, lineHeight: 1.05, color }}>{text}</div>
    </Reveal>
  );
}

/**
 * Gives every scene its tone: sets <html data-tone="…"> from the scene's id.
 * `tones` maps scene ids ('01', '02'…) to tone names in themes/poster.css (paper, night, sun, amber, coral, stone,
 * violet, teal, blue). Scenes that are not listed keep the default (paper).
 * Put <ToneTheme /> anywhere in `Stage`.
 */
export function ToneTheme({ tones }: { tones: Record<string, string> }) {
  const { s } = usePos();
  const id = deck.scenes[s]?.id;
  const tone = (id && tones[id]) || 'paper';
  useEffect(() => {
    document.documentElement.dataset.tone = tone;
  }, [tone]);
  return null;
}

/** The giant outlined scene number behind the content. Decoration: render it inside <StagePicture> so it is hidden from assistive tech. */
export function Numeral({ hideOn = [], x = 900, y = -60, size = 900 }: { hideOn?: number[]; x?: number; y?: number; size?: number }) {
  const { s } = usePos();
  return (
    <div className="poster-numeral" data-audit="off" style={{ left: x, top: y, fontSize: size, opacity: hideOn.includes(s) ? 0 : undefined }}>
      {String(s + 1).padStart(2, '0')}
    </div>
  );
}
