#!/usr/bin/env node
// Rewrites an app from the names before the rename to lievre's (MIGRATION.md).
//   npx lievre-migrate [--dry-run] [path …]   (default: the current folder)
// Classes and CSS variables are rewritten only when lievre has the same name with the new prefix,
// so the app's own classes that happen to start with k- stay as they are.
import { readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Not `lib`: apps keep their own code in src/lib.
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
const EXTENSIONS = /\.(m?[jt]sx?|cjs|css|scss|less|html|vue|svelte|mdx?|json|jsonc)$/;

/** lievre's class and variable names (without the prefix), read from the shipped styles. */
export function lievreNames(css) {
  return {
    classes: new Set([...css.matchAll(/\.lv-([\w-]+)/g)].map((m) => m[1])),
    variables: new Set([...css.matchAll(/--lv-([\w-]+)/g)].map((m) => m[1])),
  };
}

/** The rewritten text; `names` comes from lievreNames. */
export function migrate(text, names) {
  return (
    text
      .replaceAll('@kei-design/', '@lievre/')
      .replace(/(?<![\w$])KeiProvider(?![\w$])/g, 'LievreProvider')
      .replace(/(?<![\w$])useKeiTheme(?![\w$])/g, 'useLievreTheme')
      .replace(/(?<![\w-])KEI (Mono|Worn Sans|Worn Mono)(?![\w-])/g, 'Lievre $1')
      // Cascade layers: @layer reset, kei.tokens, …
      .replace(/(?<![\w-])kei\.(tokens|base|components|utilities)\b/g, 'lievre.$1')
      // Lint: rule names and the plugin's settings.
      .replace(/(["'])kei\/([a-z-]+)\1/g, '$1lievre/$2$1')
      .replace(/\b(?:eslint|oxlint|stylelint)-(?:disable|enable)[^\n]*/g, (directive) =>
        directive.replace(/(?<![\w/-])kei\//g, 'lievre/'),
      )
      // The plugin's name has to match the rules'; the app's own variable keeps its name.
      .replace(/(\bplugins["']?\s*:\s*\{[^{}]*?)(?<![\w$.'"])kei(\s*[,}])/g, '$1lievre: kei$2')
      .replace(/(\bplugins["']?\s*:\s*\{[^{}]*?)(["']?)kei\2(\s*:)/g, '$1$2lievre$2$3')
      // Only under `settings`: an app's own `kei: { … }` stays.
      .replace(
        /(\bsettings["']?\s*:\s*\{(?:[^{}]|\{[^{}]*\})*?)(["']?)kei\2(\s*:\s*\{)/g,
        '$1$2lievre$2$3',
      )
      // The root classes.
      .replace(/(?<![\w-])kei-portal(?![\w-])/g, 'lievre-portal')
      // A selector, not a property of the app's own `kei` (`...kei.configs`).
      .replace(/(?<![.\w])\.kei(?![\w.-])/g, '.lievre')
      .replace(/(\bclass(?:Name)?=\{?["'`](?:[^"'`]*\s)?)kei(?=[\s"'`])/g, '$1lievre')
      .replace(/--k-([\w-]+)/g, (all, name) => (names.variables.has(name) ? `--lv-${name}` : all))
      .replace(/(?<![\w$@/-])k-([a-z][\w-]*)/g, (all, name) =>
        names.classes.has(name) ? `lv-${name}` : all,
      )
  );
}

function* walk(path) {
  if (statSync(path).isFile()) {
    if (EXTENSIONS.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) if (!SKIP.has(entry)) yield* walk(join(path, entry));
}

// npx runs this through a link in node_modules/.bin.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const roots = args.filter((a) => !a.startsWith('--'));
  const names = lievreNames(readFileSync(new URL('../lib/lievre.css', import.meta.url), 'utf8'));
  let count = 0;
  for (const root of roots.length ? roots : ['.'])
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8');
      const next = migrate(text, names);
      if (next === text) continue;
      count++;
      console.log(`${dry ? '直す予定' : '直しました'}：${relative('.', file)}`);
      if (!dry) writeFileSync(file, next);
    }
  console.log(
    count
      ? `${count} 個のファイルです。残りは lint の lievre/no-legacy-prefix が知らせます。`
      : '直すところはありませんでした。',
  );
}
