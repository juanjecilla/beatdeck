/**
 * Syntax-highlighted code or terminal output inside a window frame (title bar + hairline box), so it reads as a
 * separate object on the slide. Same line model as `Terminal` — marks recolour a substring and hang a label under
 * it, hidden lines keep their height — and the text stays character-exact: highlighting only adds colour, every
 * line's `textContent` is the original string (so `verify --source` still compares it verbatim).
 * Colours are theme variables (`--code-*`, see themes/neutral.css and light.css).
 */
import { STAGE_H, STAGE_W } from '../app/stage';
import { markRanges, type TermLine, type TermMark } from './Terminal';
import { fitSize } from './codefit';
import { tokenize, type Lang } from './syntax';

export type { Lang } from './syntax';
export type CodeMark = TermMark;
export type CodeLine = TermLine;

export { CODE_BAR, CODE_PAD_Y, CODE_PAD_X, CODE_BORDER } from './codefit';
/** Where `fit` keeps a block by default: clear of the footer chrome and of the side margin. */
export const CODE_BOTTOM = STAGE_H - 105;
export const CODE_RIGHT = STAGE_W - 130;
const LABEL_ROW = 1.25;

/** Largest font size (≤ `size`, ≥ 20) at which the block, placed at (x, y), stays above `bottom` and left of `right`. */
export function fitCodeSize(lines: CodeLine[], size: number, fit: { x: number; y: number; right?: number; bottom?: number }): number {
  return fitSize(lines, size, fit, { right: CODE_RIGHT, bottom: CODE_BOTTOM });
}

/**
 * ```tsx
 * <CodeBlock x={150} y={200} lang="kotlin" file="Greeter.kt" size={30} fit={{ x: 150, y: 200 }} lines={[
 *   'fun greet(name: String): String {',
 *   { t: '    return "Hello, $name"', marks: [{ text: 'name', nth: 1, on: b >= 2, label: 'argument' }], labels: 1 },
 *   '}',
 * ]} />
 * ```
 * `lang`: `kotlin | xml | json | term | plain`. `term` colours `$ ` lines as shell and the rest as output.
 * `fit` takes the block's own x / y and shrinks the font (never below 20) so the frame ends above `bottom`
 * and left of `right`; `size` is then the maximum.
 */
export function CodeBlock({ lines, lang = 'plain', size = 28, x, y, file, fit, style, className }: {
  lines: (string | CodeLine)[]; lang?: Lang; size?: number; x?: number; y?: number; file?: string;
  fit?: { x: number; y: number; right?: number; bottom?: number };
  style?: React.CSSProperties; className?: string;
}) {
  const ls: CodeLine[] = lines.map((l) => (typeof l === 'string' ? { t: l } : l));
  const px = fit ? fitCodeSize(ls, size, fit) : size;
  const toks = tokenize(ls.map((l) => l.t), lang);
  return (
    <div
      className={`bd-code${className ? ` ${className}` : ''}`}
      style={{ position: x != null || y != null ? 'absolute' : undefined, left: x, top: y, ...style, ...(fit ? { maxWidth: (fit.right ?? CODE_RIGHT) - fit.x } : {}) }}
    >
      <div className="bd-code-bar">
        <span className="bd-code-dots"><i /><i /><i /></span>
        <span className="bd-code-file">{file ?? lang}</span>
      </div>
      <div className="bd-code-body bd-term" style={{ fontSize: px }}>
        {ls.map((l, li) => {
          const marks = markRanges(l.t, l.marks, 'CodeBlock');
          // cut every token at the mark boundaries, then group the pieces of one mark under one span
          const pieces: { s: string; k: string; mark: number }[] = [];
          let pos = 0;
          for (const t of toks[li]) {
            let a = pos;
            const end = pos + t.s.length;
            const cuts = marks.flatMap((mk) => [mk.i, mk.j]).filter((c) => c > a && c < end).sort((p, q) => p - q);
            for (const c of [...cuts, end]) {
              pieces.push({ s: l.t.slice(a, c), k: t.k, mark: marks.findIndex((mk) => a >= mk.i && a < mk.j) });
              a = c;
            }
            pos = end;
          }
          const groups: { mark: number; items: typeof pieces }[] = [];
          for (const p of pieces) {
            const g = groups[groups.length - 1];
            if (g && g.mark === p.mark && p.mark >= 0) g.items.push(p);
            else groups.push({ mark: p.mark, items: [p] });
          }
          return (
            <div key={li} className={`bd-term-line${l.dim ? ' dim' : ''}`} style={{ paddingBottom: `${(l.labels ?? 0) * LABEL_ROW}em`, opacity: l.on === false ? 0 : undefined }}>
              {groups.map((g, gi) => {
                const inner = g.items.map((p, pi) => <span key={pi} className={`tk-${p.k}`}>{p.s}</span>);
                if (g.mark < 0) return <span key={gi}>{inner}</span>;
                const mk = marks[g.mark].m;
                return <span key={gi} className={`bd-mk${mk.on ?? true ? ' on' : ''}${mk.row ? ' r1' : ''}`} data-label={mk.label ?? ''}>{inner}</span>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
