// Generates tokens.json from the token layer in tokens.css.
// tokens.css is the source of truth; run `npm run tokens` after editing it.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const scopes = {
  paper: /\.kei \{([^}]*)\}/,
  ink: /\.kei\[data-theme='ink'\] \{([^}]*)\}/,
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

/** Builds the exchange tokens from the tokens.css source text. */
export function buildTokens(css) {
  const start = css.indexOf('@layer kei.tokens {');
  const end = css.indexOf('@layer kei.base {', start);
  const layer = css.slice(start, end < 0 ? undefined : end);
  const tokens = {
    $description:
      'KEI design tokens, generated from tokens.css by scripts/build-tokens.mjs in @kei-design/tokens. Values are CSS strings; var() values alias other KEI tokens.',
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
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  const tokens = buildTokens(css);
  writeFileSync(new URL('../tokens.json', import.meta.url), JSON.stringify(tokens, null, 2) + '\n');
  console.log(
    Object.entries(tokens)
      .filter(([k]) => k !== '$description')
      .map(([k, v]) => `${k}: ${Object.keys(v).length}`)
      .join(', '),
  );
}
