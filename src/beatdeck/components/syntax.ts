/**
 * Tiny syntax highlighter for `CodeBlock`: Kotlin, XML, JSON and a terminal session (commands + output).
 * It only colours; it never changes a character (the text of every line is the concatenation of its tokens).
 * Colours come from the theme (`--code-*` variables, see themes/neutral.css).
 */
export type Kind =
  | 'plain' | 'kw' | 'str' | 'num' | 'com' | 'doc' | 'dtag' | 'ann' | 'fn' | 'type' | 'prop'
  | 'tag' | 'attr' | 'prompt' | 'flag' | 'var' | 'err' | 'dim';
export type Lang = 'kotlin' | 'xml' | 'json' | 'term' | 'plain';
export interface Tok { s: string; k: Kind }

const KOTLIN_KW = new Set(('package import class interface object fun val var if else when for while do return throw try catch finally is as in ' +
  'null true false this super override abstract private protected public internal data enum sealed open lateinit suspend inline companion ' +
  'constructor init typealias by const').split(' '));

const push = (out: Tok[], s: string, k: Kind) => { if (s) out.push({ s, k }); };

function kotlinLine(line: string, st: { block: false | 'doc' | 'com' }): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = line.length;
  let afterDecl = false; // next identifier is a declared property/parameter name (after val / var)
  while (i < n) {
    if (st.block) {
      const end = line.indexOf('*/', i);
      const stop = end < 0 ? n : end + 2;
      const chunk = line.slice(i, stop);
      if (st.block === 'doc') {
        // KDoc: highlight @param / @return tags
        const re = /@\w+/g; let last = 0; let m: RegExpExecArray | null;
        while ((m = re.exec(chunk))) { push(out, chunk.slice(last, m.index), 'doc'); push(out, m[0], 'dtag'); last = m.index + m[0].length; }
        push(out, chunk.slice(last), 'doc');
      } else push(out, chunk, 'com');
      i = stop;
      if (end >= 0) st.block = false;
      continue;
    }
    const rest = line.slice(i);
    let m: RegExpMatchArray | null;
    if (rest.startsWith('//')) { push(out, rest, 'com'); break; }
    if (rest.startsWith('/*')) { st.block = rest.startsWith('/**') ? 'doc' : 'com'; const end = rest.indexOf('*/', 2); const stop = end < 0 ? rest.length : end + 2; const chunk = rest.slice(0, stop); push(out, chunk, st.block === 'doc' ? 'doc' : 'com'); if (end >= 0) st.block = false; i += stop; continue; }
    if ((m = rest.match(/^"(?:\\.|[^"\\])*"?/))) { push(out, m[0], 'str'); i += m[0].length; continue; }
    if ((m = rest.match(/^@\w+/))) { push(out, m[0], 'ann'); i += m[0].length; continue; }
    if ((m = rest.match(/^\d[\d_]*(?:\.\d+)?[fFL]?/))) { push(out, m[0], 'num'); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      const after = rest.slice(w.length);
      const prev = out.length ? out[out.length - 1] : null;
      let k: Kind = 'plain';
      if (KOTLIN_KW.has(w)) k = 'kw';
      else if (afterDecl) k = 'prop';
      else if (/^[A-Z][A-Z0-9_]+$/.test(w)) k = 'prop';
      else if (/^[A-Z]/.test(w)) k = 'type';
      else if (/^\s*\(/.test(after)) k = 'fn';
      else if (/^\s*:(?!:)/.test(after) && !(prev && prev.s.trim() === '.')) k = 'prop';
      push(out, w, k);
      afterDecl = k === 'kw' && (w === 'val' || w === 'var');
      i += w.length; continue;
    }
    push(out, line[i], 'plain'); i += 1;
    if (line[i - 1].trim()) afterDecl = false;
  }
  return out;
}

function xmlLine(line: string, st: { str: boolean }): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    if (st.str) { // inside a multi-line attribute value
      const end = line.indexOf('"', i);
      const stop = end < 0 ? line.length : end + 1;
      push(out, line.slice(i, stop), 'str'); i = stop; if (end >= 0) st.str = false; continue;
    }
    const rest = line.slice(i); let m: RegExpMatchArray | null;
    if ((m = rest.match(/^<!--.*?-->/))) { push(out, m[0], 'com'); i += m[0].length; continue; }
    if ((m = rest.match(/^<\??\/?[\w:.-]+/))) { push(out, m[0], 'tag'); i += m[0].length; continue; }
    if ((m = rest.match(/^\??\/?>/))) { push(out, m[0], 'tag'); i += m[0].length; continue; }
    if ((m = rest.match(/^[\w:.-]+(?==)/))) { push(out, m[0], 'attr'); i += m[0].length; continue; }
    if (rest[0] === '"') { const end = rest.indexOf('"', 1); const stop = end < 0 ? rest.length : end + 1; push(out, rest.slice(0, stop), 'str'); if (end < 0) st.str = true; i += stop; continue; }
    push(out, rest[0], 'plain'); i += 1;
  }
  return out;
}

function jsonLine(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    push(out, line.slice(last, m.index), 'plain');
    if (m[1] !== undefined) { push(out, m[1], m[2] ? 'prop' : 'str'); push(out, m[2] ?? '', 'plain'); }
    else if (m[3] !== undefined) push(out, m[3], 'num');
    else push(out, m[4], 'kw');
    last = m.index + m[0].length;
  }
  push(out, line.slice(last), 'plain');
  return out;
}

/** One shell line. `st.dq` = inside a double-quoted string that continues from the previous line. */
function shellLine(line: string, st: { dq: boolean }): Tok[] {
  const out: Tok[] = [];
  let i = 0; let cmdNext = false;
  if (!st.dq && line.startsWith('$ ')) { push(out, '$', 'prompt'); push(out, ' ', 'plain'); i = 2; cmdNext = true; }
  while (i < line.length) {
    const rest = line.slice(i); let m: RegExpMatchArray | null;
    if (rest === '\\') { push(out, rest, 'dim'); break; }
    if (st.dq) {
      if ((m = rest.match(/^\\./))) { push(out, m[0], 'str'); i += 2; continue; }
      if (rest[0] === '"') { push(out, '"', 'str'); st.dq = false; i += 1; continue; }
      if ((m = rest.match(/^\$\w+/))) { push(out, m[0], 'var'); i += m[0].length; continue; }
      if ((m = rest.match(/^--?[A-Za-z][\w-]*/)) && /\s|^$/.test(line[i - 1] ?? ' ')) { push(out, m[0], 'flag'); i += m[0].length; continue; }
      if ((m = rest.match(/^'[^']*'?/))) { push(out, m[0], 'str'); i += m[0].length; continue; }
      if ((m = rest.match(/^[^"\\$' ]+| /))) { push(out, m[0], 'str'); i += m[0].length; continue; }
      push(out, rest[0], 'str'); i += 1; continue;
    }
    if (rest[0] === '"') { push(out, '"', 'str'); st.dq = true; i += 1; continue; }
    if ((m = rest.match(/^'[^']*'?/))) { push(out, m[0], 'str'); i += m[0].length; continue; }
    if ((m = rest.match(/^\$\w+/))) { push(out, m[0], 'var'); i += m[0].length; continue; }
    if ((m = rest.match(/^--?[A-Za-z][\w-]*/)) && /\s|^$/.test(line[i - 1] ?? ' ')) { push(out, m[0], 'flag'); i += m[0].length; continue; }
    if ((m = rest.match(/^\|\||^&&|^[|;]/))) { push(out, m[0], 'plain'); i += m[0].length; cmdNext = true; continue; }
    if ((m = rest.match(/^[A-Za-z_][\w]*=/))) { push(out, m[0], 'prop'); i += m[0].length; cmdNext = false; continue; } // VAR=value
    if ((m = rest.match(/^[^\s"'$|;&\\]+/))) { push(out, m[0], cmdNext ? 'fn' : 'plain'); cmdNext = false; i += m[0].length; continue; }
    push(out, rest[0], 'plain'); i += 1;
  }
  return out;
}

/** Command output: YAML-ish `key: value` lines, error lines, `package#function` ids. */
function outputLine(line: string, st: { err: boolean }): Tok[] {
  if (!line.trim()) { st.err = false; return [{ s: line, k: 'plain' }]; }
  if (/^Error\b/.test(line)) { st.err = true; return [{ s: line, k: 'err' }]; }
  if (st.err) return [{ s: line, k: 'err' }];
  let m: RegExpMatchArray | null;
  if ((m = line.match(/^([\w.]+)#(\w+)$/))) return [{ s: m[1], k: 'dim' }, { s: '#', k: 'plain' }, { s: m[2], k: 'fn' }];
  if ((m = line.match(/^(\s*(?:-\s+)?)([A-Za-z_][\w.]*)(:)(\s*)(.*)$/))) {
    const out: Tok[] = [{ s: m[1], k: 'plain' }, { s: m[2], k: 'prop' }, { s: m[3], k: 'plain' }, { s: m[4], k: 'plain' }];
    const v = m[5];
    if (/^".*"$/.test(v)) out.push({ s: v, k: 'str' });
    else if (/^-?\d+(\.\d+)?$/.test(v)) out.push({ s: v, k: 'num' });
    else if (/^(true|false|null)$/.test(v)) out.push({ s: v, k: 'kw' });
    else if (v) out.push({ s: v, k: 'str' });
    return out;
  }
  return [{ s: line, k: 'plain' }];
}

export function tokenize(lines: string[], lang: Lang): Tok[][] {
  if (lang === 'plain') return lines.map((s) => [{ s, k: 'plain' as Kind }]);
  if (lang === 'json') return lines.map(jsonLine);
  if (lang === 'xml') { const st = { str: false }; return lines.map((l) => xmlLine(l, st)); }
  if (lang === 'kotlin') { const st: { block: false | 'doc' | 'com' } = { block: false }; return lines.map((l) => kotlinLine(l, st)); }
  // term: a line is shell if it starts with "$ " or continues a previous shell line (trailing "\" or an open double quote)
  const sh = { dq: false }; const out = { err: false }; let cont = false;
  return lines.map((l) => {
    const isShell = l.startsWith('$ ') || cont || sh.dq;
    if (isShell) { const t = shellLine(l, sh); cont = l.trimEnd().endsWith('\\'); return t; }
    cont = false; return outputLine(l, out);
  });
}
