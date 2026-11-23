// @lievre/react/fonts.css brings in @lievre/fonts. The tokens name its families, so each one the
// tokens use must be defined there, in every weight token.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const own = readFileSync('src/styles/fonts.css', 'utf8');
const tokens = readFileSync(require.resolve('@lievre/tokens/tokens.css'), 'utf8');
const pkg = (path: string) => readFileSync(require.resolve(`@lievre/fonts/${path}`), 'utf8');
const css = [pkg('sans.css'), pkg('term-jp.css')].join('\n');
const weights = [...tokens.matchAll(/--lv-weight-\w+: (\d+);/g)].map(([, w]) => w);

describe('fonts.css', () => {
  it('imports @lievre/fonts', () => {
    expect(own).toMatch(/^@import '@lievre\/fonts';$/m);
  });

  for (const family of ['Lievre Sans', 'Lievre Term JP'])
    it(`${family} has a face for every weight token (${weights.join('・')})`, () => {
      for (const weight of weights)
        expect(css, `@lievre/fonts に ${family} の ${weight} がありません`).toMatch(
          new RegExp(`font-family: '${family}';[^}]*font-weight: ${weight};`),
        );
    });

  it('the tokens put Lievre Sans and Lievre Term JP first', () => {
    expect(tokens).toMatch(/--lv-font-sans: 'Lievre Sans',/);
    expect(tokens).toMatch(/--lv-font-mono: 'Lievre Term JP',/);
  });
});
