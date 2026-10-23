export interface AuditResult {
  /** Problems that fail verify: text outside the stage, overlapping text, characters that change under uppercase. */
  errors: string[];
  /** Text under the 18 px stage minimum. */
  warnings: string[];
  /** Text closer than `audit.safeMargin` to a stage edge. */
  edges: { t: string; edge: 'left' | 'right' | 'top' | 'bottom'; d: number; m: number }[];
  /** Text with a painted element on top of it; `by` is the covering element as `tag.class`. */
  covered: { t: string; by: string }[];
  /** Texts that must match the source verbatim. */
  exact: { t: string; term: boolean }[];
}

/** Audit the frame on screen. Self-contained: pass it to `page.evaluate`. */
export function auditFrame(): AuditResult;

export function edgeLine(e: AuditResult['edges'][number]): string;
export function coveredLine(c: AuditResult['covered'][number]): string;
