import { describe, it, expect } from 'vitest';
import tokens from '@lievre/tokens/tokens.json';
import { readFileSync } from 'node:fs';
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

// tokens.json is kept in step with tokens.css by the test in @lievre/tokens.
describe('Semantic color contrast', () => {
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
    // Menu rows: the description (muted) stays readable on the highlighted row, including a
    // danger row, and the submenu arrow on the open row.
    for (const background of ['accent-soft', 'danger-soft'])
      it(`${theme}: menu description muted / ${background} reaches 4.5:1`, () => {
        expect(ratio(resolve(set, 'muted'), resolve(set, background))).toBeGreaterThanOrEqual(4.5);
      });
    // A strong badge is filled with the status colour and lettered in the surface colour.
    for (const tone of ['muted', 'success', 'warning', 'danger', 'info'])
      it(`${theme}: strong badge text / ${tone} reaches 4.5:1`, () => {
        expect(ratio(resolve(set, 'surface'), resolve(set, tone))).toBeGreaterThanOrEqual(4.5);
      });
    // The progress bar (and its stripes when it has no value) must show on the sunken track.
    for (const bar of ['accent', 'success', 'danger'])
      it(`${theme}: progress bar ${bar} / surface-sunken reaches 3:1`, () => {
        expect(ratio(resolve(set, bar), resolve(set, 'surface-sunken'))).toBeGreaterThanOrEqual(3);
      });
    // An alert's own controls sit on its tinted ground: the muted close icon, the secondary
    // button's outline and the focus ring.
    for (const tone of ['success', 'warning', 'danger', 'info'])
      for (const foreground of ['muted', 'border-strong', 'focus'])
        it(`${theme}: alert control ${foreground} / ${tone}-soft reaches 3:1`, () => {
          expect(
            ratio(resolve(set, foreground), resolve(set, `${tone}-soft`)),
          ).toBeGreaterThanOrEqual(3);
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
    // The app frame (sidebar) is the theme's own dark surface: its text, the selected item and the
    // focus outline (drawn in on-frame) must hold on every frame tint.
    for (const background of ['frame', 'frame-hover', 'frame-inset'])
      for (const foreground of ['on-frame', 'frame-muted'])
        it(`${theme}: frame ${foreground} / ${background} reaches 4.5:1`, () => {
          expect(ratio(resolve(set, foreground), resolve(set, background))).toBeGreaterThanOrEqual(
            4.5,
          );
        });
    it(`${theme}: frame selected item text reaches 4.5:1`, () => {
      expect(
        ratio(resolve(set, 'on-frame-selected'), resolve(set, 'frame-selected')),
      ).toBeGreaterThanOrEqual(4.5);
    });
    for (const background of ['frame', 'frame-hover'])
      it(`${theme}: frame selected item and focus outline / ${background} reach 3:1`, () => {
        expect(
          ratio(resolve(set, 'frame-selected'), resolve(set, background)),
        ).toBeGreaterThanOrEqual(3);
        expect(ratio(resolve(set, 'on-frame'), resolve(set, background))).toBeGreaterThanOrEqual(3);
      });
    it(`${theme}: the frame line shows against the frame`, () => {
      expect(ratio(resolve(set, 'frame-line'), resolve(set, 'frame'))).toBeGreaterThan(1.2);
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

  // The meter's ticks are border-strong straight on the card's surface: wear draws no band under
  // the scale, so the dial ages with the surface like every other part (off, baked and live).
  it('draws the meter ticks in border-strong, with nothing under them', () => {
    const css = readFileSync('src/styles/lievre.css', 'utf8');
    expect(css).toMatch(/\.lv-meter-ticks \{[^}]*var\(--lv-border-strong\)/);
    expect(readFileSync('src/styles/lievre-wear.css', 'utf8')).not.toContain('lv-meter-face');
  });
  // Under wear (baked and live) the ticks take the held outline, like control outlines, so they
  // keep 3:1 on the stained, browned and scuffed surface too.
  for (const theme of themes) {
    const set = themeTokens(theme);
    it(`${theme}: meter ticks reach 3:1 on the surface, plain and worn`, () => {
      expect(ratio(resolve(set, 'border-strong'), resolve(set, 'surface'))).toBeGreaterThanOrEqual(
        3,
      );
      for (const worn of wornBackgrounds(WEAR_CONFIG, set, theme, 'surface'))
        expect(ratio(heldOutline(WEAR_CONFIG, set, theme), worn)).toBeGreaterThanOrEqual(3);
    });
  }
});

// Under forced colours the browser paints a backplate behind text as tall as the glyphs. On the
// small badge's 16px line it covers the forced border at the top and bottom, so the small badge
// paints itself in system colours with no backplate.
describe('Forced colours', () => {
  it('keeps the small badge border clear of the text backplate', () => {
    const css = readFileSync('src/styles/lievre.css', 'utf8');
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'));
    expect(forced).toMatch(
      /\.lv-badge--sm \{[^}]*forced-color-adjust: none;[^}]*background: Canvas;/,
    );
  });
});
