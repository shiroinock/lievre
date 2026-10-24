import { describe, it, expect } from 'vitest';
import tokens from '../../tokens/tokens.json';
import { readFileSync } from 'node:fs';
import { buildTokens } from '../../scripts/build-tokens.mjs';
import { KASURE_FLOOR, SURFACE_MAX } from '../wear/params.mjs';
type TokenSet = Record<string, { $value: string }>;
const themes = ['paper', 'ink', 'sepia', 'rust'] as const;
function themeTokens(theme: (typeof themes)[number]) {
  return { ...tokens.paper, ...(theme === 'paper' ? {} : tokens[theme]) } as TokenSet;
}
function resolve(set: TokenSet, key: string): string {
  const value = set[key].$value;
  const alias = value.match(/^var\(--k-(.+)\)$/);
  return alias ? resolve(set, alias[1]) : value;
}
function luminance(hex: string) {
  const c = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function mix(a: string, b: string, amount: number) {
  const channels = (hex: string) =>
    hex
      .slice(1)
      .match(/.{2}/g)!
      .map((v) => parseInt(v, 16));
  const [x, y] = [channels(a), channels(b)];
  return (
    '#' +
    x
      .map((v, i) => Math.round(v + (y[i] - v) * amount))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}
function ratio(a: string, b: string) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (hi + 0.05) / (lo + 0.05);
}
describe('Semantic color contrast and token synchronization', () => {
  it('keeps tokens.json identical to what kei.css generates', () => {
    // Every scope, both directions: run `npm run tokens` after editing kei.css.
    expect(tokens).toEqual(buildTokens(readFileSync('src/styles/kei.css', 'utf8')));
  });
  for (const theme of themes) {
    const set = themeTokens(theme);
    for (const foreground of ['text', 'muted', 'subtle'])
      for (const background of ['bg', 'surface', 'surface-raised', 'surface-sunken']) {
        it(`${theme}: ${foreground} / ${background} reaches 4.5:1`, () => {
          expect(ratio(resolve(set, foreground), resolve(set, background))).toBeGreaterThanOrEqual(
            4.5,
          );
        });
      }
    for (const tone of ['success', 'warning', 'danger', 'info']) {
      it(`${theme}: ${tone} status text reaches 4.5:1`, () => {
        expect(ratio(resolve(set, tone), resolve(set, `${tone}-soft`))).toBeGreaterThanOrEqual(4.5);
      });
    }
    // Status text is also used without a tinted container (metrics, errors, table actions).
    for (const foreground of ['success', 'warning', 'danger', 'info'])
      for (const background of ['bg', 'surface', 'surface-raised', 'surface-sunken']) {
        it(`${theme}: ${foreground} text / ${background} reaches 4.5:1`, () => {
          expect(ratio(resolve(set, foreground), resolve(set, background))).toBeGreaterThanOrEqual(
            4.5,
          );
        });
      }
    for (const background of [
      'surface',
      'surface-raised',
      'surface-sunken',
      'accent-soft',
      'selected',
    ]) {
      it(`${theme}: focus / ${background} reaches 3:1`, () => {
        expect(ratio(resolve(set, 'focus'), resolve(set, background))).toBeGreaterThanOrEqual(3);
      });
    }
    it(`${theme}: selected row text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'text'), resolve(set, 'selected'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme}: selected menu text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'accent'), resolve(set, 'selected'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme}: OFF switch thumb reaches 3:1`, () => {
      expect(
        ratio(resolve(set, 'border-strong'), resolve(set, 'surface-sunken')),
      ).toBeGreaterThanOrEqual(3);
    });
    for (const background of ['surface', 'surface-raised', 'surface-sunken']) {
      it(`${theme}: control boundary / ${background} reaches 3:1`, () => {
        expect(
          ratio(resolve(set, 'border-strong'), resolve(set, background)),
        ).toBeGreaterThanOrEqual(3);
      });
    }
    it(`${theme}: primary hover text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'on-accent'), resolve(set, 'accent-hover'))).toBeGreaterThanOrEqual(
        4.5,
      );
    });
    it(`${theme}: danger action text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'on-danger'), resolve(set, 'danger'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme}: enabled switch thumb reaches 3:1`, () => {
      expect(ratio(resolve(set, 'on-accent'), resolve(set, 'accent'))).toBeGreaterThanOrEqual(3);
    });
    it(`${theme}: primary action text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'on-accent'), resolve(set, 'accent'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${theme}: focus ring reaches 3:1 on the working surface`, () => {
      expect(ratio(resolve(set, 'focus'), resolve(set, 'bg'))).toBeGreaterThanOrEqual(3);
    });
  }

  // Wear stains the working surface and panels (bg, surface) toward the text colour, at most
  // SURFACE_MAX at the densest speckle.
  // Every text colour must still reach 4.5:1 there, and text-coloured glyphs must reach it at the
  // faintest point of the dry-brush mask (KASURE_FLOOR) on top of that stain.
  for (const theme of themes) {
    const set = themeTokens(theme);
    for (const background of ['bg', 'surface']) {
      const stained = mix(resolve(set, background), resolve(set, 'text'), SURFACE_MAX);
      for (const foreground of ['text', 'muted', 'subtle', 'success', 'warning', 'danger', 'info'])
        it(`${theme} wear: ${foreground} / stained ${background} reaches 4.5:1`, () => {
          expect(ratio(resolve(set, foreground), stained)).toBeGreaterThanOrEqual(4.5);
        });
      it(`${theme} wear: dry-brushed text / stained ${background} reaches 4.5:1`, () => {
        const faint = mix(stained, resolve(set, 'text'), KASURE_FLOOR);
        expect(ratio(faint, stained)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
