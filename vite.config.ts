import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const slash = (p: string) => p.replace(/\\/g, '/');

/**
 * Localized decks: `<deck>/i18n/index.ts` re-exports the default locale's table (so editors and tsc see real types).
 * With BEATDECK_LOCALE=es, every import that resolves to that file is redirected to `<deck>/i18n/es.ts`, so a
 * build bundles one table only.
 */
function localeTable(deckDir: string, locale: string | null): Plugin {
  const index = slash(root(`./${deckDir}/i18n/index.ts`));
  return {
    name: 'beatdeck-locale',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!locale || !importer || !/i18n/.test(source)) return null;
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!r || slash(r.id) !== index) return null;
      const table = root(`./${deckDir}/i18n/${locale}.ts`);
      if (!existsSync(table)) this.error(`locale "${locale}": ${deckDir}/i18n/${locale}.ts does not exist`);
      return table;
    },
  };
}

/**
 * The deck lives in `deck/`. `--mode <name>` builds `examples/<name>/` instead (e.g. `--mode kernel-panic`),
 * into `dist-<name>/`. `beatdeck` resolves to the engine in `src/beatdeck/`.
 */
export default defineConfig(({ mode }) => {
  const example = mode === 'development' || mode === 'production' ? null : mode;
  const deckDir = example ? `examples/${example}` : 'deck';
  const locale = process.env.BEATDECK_LOCALE || null;
  return {
    base: './',
    plugins: [react(), localeTable(deckDir, locale)],
    define: { __BEATDECK_LOCALE__: JSON.stringify(locale) },
    resolve: {
      alias: {
        beatdeck: root('./src/beatdeck/index.ts'),
        '@deck': root(`./${deckDir}/index.tsx`),
      },
    },
    build: {
      outDir: example ? `dist-${example}` : 'dist',
      target: 'es2022',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 900,
    },
    server: { host: '127.0.0.1', port: 5173 },
    preview: { host: '127.0.0.1' },
  };
});
