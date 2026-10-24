// Generates tokens/tokens.json from the token layer in src/styles/kei.css.
// kei.css is the source of truth; run `npm run tokens` after editing it.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const scopes = {
  paper: /\.kei \{([^}]*)\}/,
  ink: /\.kei\[data-theme='ink'\] \{([^}]*)\}/,
  sepia: /\.kei\[data-theme='sepia'\] \{([^}]*)\}/,
  rust: /\.kei\[data-theme='rust'\] \{([^}]*)\}/,
  compact: /\.kei\[data-density='compact'\] \{([^}]*)\}/,
  interface: /\.kei\[data-typography='interface'\] \{([^}]*)\}/,
};

function typeOf(tokens, name, value) {
  const alias = value.match(/^var\(--k-([\w-]+)\)$/);
  if (alias) return tokens.paper[alias[1]]?.$type ?? typeOf(tokens, alias[1], '');
  if (value.startsWith('#')) return 'color';
  if (name.startsWith('font-')) return 'fontFamily';
  if (name.startsWith('weight-')) return 'fontWeight';
  if (name === 'motion') return 'duration';
  if (name === 'ease') return 'cubicBezier';
  if (/^(leading|tracking)-/.test(name)) return 'number';
  return 'dimension';
}

/** Builds the exchange tokens from the kei.css source text. */
export function buildTokens(css) {
  const layer = css.slice(css.indexOf('@layer kei.tokens {'), css.indexOf('@layer kei.base {'));
  const tokens = {
    $description:
      'KEI design tokens, generated from src/styles/kei.css by scripts/build-tokens.mjs. Values are CSS strings; var() values alias other KEI tokens.',
  };
  for (const [scope, pattern] of Object.entries(scopes)) {
    const body = layer.match(pattern)?.[1] ?? '';
    tokens[scope] = {};
    for (const [, name, raw] of body.matchAll(/--k-([\w-]+):\s*([^;]+);/g)) {
      const value = raw.replace(/\s+/g, ' ').trim();
      tokens[scope][name] = { $type: typeOf(tokens, name, value), $value: value };
    }
  }
  return tokens;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = readFileSync(new URL('../src/styles/kei.css', import.meta.url), 'utf8');
  const tokens = buildTokens(css);
  writeFileSync(
    new URL('../tokens/tokens.json', import.meta.url),
    JSON.stringify(tokens, null, 2) + '\n',
  );
  console.log(
    Object.entries(tokens)
      .filter(([k]) => k !== '$description')
      .map(([k, v]) => `${k}: ${Object.keys(v).length}`)
      .join(', '),
  );
}
