import { describe, it, expect } from 'vitest';
import tokens from '../../tokens/tokens.json';
import { readFileSync } from 'node:fs';
import { buildTokens } from '../../scripts/build-tokens.mjs';
import { KASURE_FLOOR, SURFACE_MAX, WEAR_CONFIG } from '../wear/params.mjs';
import {
  heldOutline,
  mix,
  ratio,
  resolve,
  TEXT_COLOURS,
  themeTokens as tokensFor,
  wornBackgrounds,
} from '../wear/contrast.mjs';
const themes = ['paper', 'ink'] as const;
const themeTokens = (theme: (typeof themes)[number]) => tokensFor(tokens, theme);

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
    // Selected rows also carry secondary lines and ghost buttons in muted text.
    for (const foreground of ['text', 'muted']) {
      it(`${theme}: selected row ${foreground} reaches 4.5:1`, () => {
        expect(ratio(resolve(set, foreground), resolve(set, 'selected'))).toBeGreaterThanOrEqual(
          4.5,
        );
      });
    }
    it(`${theme}: selected menu text reaches 4.5:1`, () => {
      expect(ratio(resolve(set, 'accent'), resolve(set, 'selected'))).toBeGreaterThanOrEqual(4.5);
    });
    // A selected row must stand apart from the surface it sits on and from the hover tint.
    for (const [background, min] of [
      ['surface', 1.3],
      ['bg', 1.25],
      ['surface-sunken', 1.15],
    ] as const) {
      it(`${theme}: selected / ${background} differs by ${min}:1`, () => {
        expect(ratio(resolve(set, 'selected'), resolve(set, background))).toBeGreaterThanOrEqual(
          min,
        );
      });
    }
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
  // SURFACE_MAX at the densest speckle; yake browns them toward the theme's tone at the darkest
  // corner, and a scuff lays the rubbed colour on top. Take all three at their strongest, stacked.
  // Every text colour (body, muted, status and link) must still reach 4.5:1 there, text-coloured
  // glyphs must reach it at the faintest point of the dry-brush mask (KASURE_FLOOR) on top, and the
  // focus ring and control outlines must reach 3:1. Wear darkens the outline with the paper
  // (heldOutline) where the token alone would fall short.
  for (const theme of themes) {
    const set = themeTokens(theme);
    for (const background of ['bg', 'surface']) {
      const [stained, browned, rubbed] = wornBackgrounds(WEAR_CONFIG, set, theme, background);
      it(`${theme} wear: the stain is SURFACE_MAX of the text colour`, () => {
        expect(stained).toBe(mix(resolve(set, background), resolve(set, 'text'), SURFACE_MAX));
      });
      for (const [layer, worn] of [
        ['stained', stained],
        ['browned', browned],
        ['scuffed', rubbed],
      ]) {
        for (const foreground of TEXT_COLOURS)
          it(`${theme} wear: ${foreground} / ${layer} ${background} reaches 4.5:1`, () => {
            expect(ratio(resolve(set, foreground), worn)).toBeGreaterThanOrEqual(4.5);
          });
        it(`${theme} wear: focus ring / ${layer} ${background} reaches 3:1`, () => {
          expect(ratio(resolve(set, 'focus'), worn)).toBeGreaterThanOrEqual(3);
        });
        it(`${theme} wear: control outline (held) / ${layer} ${background} reaches 3:1`, () => {
          expect(ratio(heldOutline(WEAR_CONFIG, set, theme), worn)).toBeGreaterThanOrEqual(3);
        });
        it(`${theme} wear: dry-brushed text / ${layer} ${background} reaches 4.5:1`, () => {
          const faint = mix(worn, resolve(set, 'text'), KASURE_FLOOR);
          expect(ratio(faint, worn)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
