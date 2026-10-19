// Builds the deck: typecheck, bundle, offline check. A deck that declares `locales` in its deck.config.ts gets
// one bundle per locale.
//
//   npm run build                    deck/ → dist/   (several locales: dist/<locale>/, dist/index.html, dist/locales.json)
//   npm run build -- --locale es     only that locale (the others in dist/ stay as they are)
//   npm run build -- --mode i18n     examples/i18n/ → dist-i18n/ (beatdeck repo only)
//
// Per locale, vite runs with BEATDECK_LOCALE=<locale>: `<deck>/i18n/index.ts` then resolves to `<deck>/i18n/<locale>.ts`
// (see vite.config.ts), `<html lang>` is the locale and the deck id gets a `-<locale>` suffix.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runnerImport } from 'vite';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const mode = flag('mode');
const only = flag('locale');
const deckDir = mode ? `examples/${mode}` : 'deck';
const dist = mode ? `dist-${mode}` : 'dist';
const node = process.execPath;
// vite (runnerImport below) sets NODE_ENV in this process; the child builds must see the environment we were started with
const startEnv = { ...process.env };
const run = (script, argv, env = {}) => {
  const r = spawnSync(node, [script, ...argv], { stdio: 'inherit', env: { ...startEnv, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const fail = (msg) => { console.error(`✕ build: ${msg}`); process.exit(1); };

run('node_modules/typescript/bin/tsc', ['--noEmit', '-p', '.']);

// locales: declared in <deckDir>/deck.config.ts
let locales = null;
const cfgFile = resolve(deckDir, 'deck.config.ts');
if (existsSync(cfgFile)) {
  const { module } = await runnerImport(cfgFile, { configFile: false, logLevel: 'silent' });
  locales = module.config?.locales ?? null;
}
const vite = (outDir, env) => run('node_modules/vite/bin/vite.js', ['build', ...(mode ? ['--mode', mode] : []), ...(outDir ? ['--outDir', outDir] : [])], env);

if (!locales) {
  if (only) fail(`--locale ${only}, but ${deckDir}/deck.config.ts declares no \`locales\``);
  vite();
  run('scripts/check-offline.mjs', [dist, deckDir]);
  process.exit(0);
}

// validate the declaration against the files
if (!Array.isArray(locales) || !locales.length || locales.some((l) => typeof l !== 'string' || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(l))) {
  fail('`locales` in deck.config.ts must be a non-empty list of language codes, e.g. ["en", "es"]');
}
const i18n = join(deckDir, 'i18n');
const tables = existsSync(i18n) ? readdirSync(i18n).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.slice(0, -3)) : [];
for (const l of locales) if (!tables.includes(l)) fail(`locale "${l}" is listed in deck.config.ts but ${i18n}/${l}.ts does not exist`);
for (const t of tables) if (!locales.includes(t)) fail(`${i18n}/${t}.ts is not listed in \`locales\` in deck.config.ts`);
const index = existsSync(join(i18n, 'index.ts')) ? readFileSync(join(i18n, 'index.ts'), 'utf8') : '';
if (!new RegExp(`from\\s+['"]\\./${locales[0]}['"]`).test(index)) {
  fail(`${i18n}/index.ts must re-export the default locale (the first in \`locales\`): export { strings } from './${locales[0]}';`);
}
if (only && !locales.includes(only)) fail(`--locale ${only} is not one of ${locales.join(', ')}`);

if (!only) rmSync(dist, { recursive: true, force: true });
for (const l of only ? [only] : locales) {
  console.log(`\n── ${l} ──`);
  vite(`${dist}/${l}`, { BEATDECK_LOCALE: l });
  run('scripts/check-offline.mjs', [`${dist}/${l}`, deckDir]);
}

// a root page that links the locales, so the folder can be served or deployed as it is
const built = locales.filter((l) => existsSync(join(dist, l, 'index.html')));
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'locales.json'), JSON.stringify({ locales: built }, null, 2) + '\n');
const label = (l) => { try { return new Intl.DisplayNames([l], { type: 'language' }).of(l); } catch { return l; } };
writeFileSync(join(dist, 'index.html'), `<!doctype html>
<html lang="${locales[0]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Choose a language</title>
<style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:12px;background:#000;color:#ededed;font:28px system-ui,sans-serif}a{color:inherit;text-decoration:none;border:1px solid #444;padding:16px 40px;border-radius:6px}a:hover{border-color:#ededed}</style></head>
<body>${built.map((l) => `<a href="./${l}/">${label(l)}</a>`).join('')}</body></html>
`);
console.log(`\n✓ build · ${built.length} locale(s): ${built.join(', ')} → ${dist}/`);
