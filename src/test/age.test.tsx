import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import tokens from '../../tokens/tokens.json';
import { buildWear, readConfig } from '../../scripts/build-wear.mjs';
import { normaliseConfig, PRESETS, type WearConfig } from '../wear/presets.mjs';
import {
  AGE_STATES,
  ageContrast,
  ageInkVars,
  agedTokens,
  FADE_GROUPS,
  FADED,
  mottleLimit,
  RULE_PERIOD,
  ruleStops,
  STATE_INKS,
  type Age,
} from '../wear/age.mjs';
import { deltaE, fade, hexToOklch } from '../wear/oklch.mjs';
import { ratio, resolve, themeTokens } from '../wear/contrast.mjs';
import { THEMES } from '../wear/textures.mjs';
import { KeiProvider } from '../index';

const presets = Object.keys(PRESETS).map((name) =>
  normaliseConfig({ preset: name, ...PRESETS[name as keyof typeof PRESETS] }),
);
// Every age slider at the top of its range, on the strongest wear.
const loudest: WearConfig = {
  ...presets.at(-1)!,
  age: { fade: 1, mottle: 1, rules: 1, chips: 1 },
};
const levels: Age[] = ['light', 'heavy'];

describe('Age: faded inks keep WCAG AA', () => {
  it('keeps every faded pairing at 4.5:1 and the focus ring at 3:1, for every preset and the loudest values', () => {
    for (const config of [...presets, loudest])
      for (const [theme, { text, ui, failed }] of Object.entries(ageContrast(config, tokens))) {
        expect(failed, `${config.preset} ${theme}`).toEqual([]);
        expect(text, `${config.preset} ${theme}`).toBeGreaterThanOrEqual(4.5);
        expect(ui, `${config.preset} ${theme}`).toBeGreaterThanOrEqual(3);
      }
  });

  it('fades as far as asked where contrast allows, and stops short where it would not', () => {
    for (const theme of THEMES) {
      const { amount, asked, colours: inks } = agedTokens(loudest, tokens, theme, 'heavy');
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThanOrEqual(asked);
      for (const name of FADED.filter((n) => !FADE_GROUPS.neutrals.names.includes(n))) {
        // Fading loses chroma at the same lightness: a coloured token is never more colourful
        // than fresh. (Greys and the paper gain a trace of the old-paper yellow instead.)
        expect(hexToOklch(inks[name].aged)[1]).toBeLessThanOrEqual(
          hexToOklch(inks[name].fresh)[1] + 0.002,
        );
      }
      // The accent visibly ages on every theme.
      expect(deltaE(inks.accent.aged, inks.accent.fresh), theme).toBeGreaterThan(0.03);
    }
    // A blue fades to slate, not through purple.
    const [, , hue] = hexToOklch(fade('#2424d8', 1));
    expect(hue).toBeGreaterThan(200);
    expect(hue).toBeLessThan(275);
  });

  it('fades every colour token a part can read, so nothing stays fresh beside faded parts', () => {
    const colours = new Set(
      THEMES.flatMap((theme) => {
        const set = themeTokens(tokens, theme);
        return Object.keys(set).filter((name) => {
          try {
            return /^#[0-9a-f]{6,8}$/i.test(resolve(set, name));
          } catch {
            return false;
          }
        });
      }),
    );
    // The overlay is translucent and darkens whatever it covers; focus follows the fresh accent.
    const kept = new Set(['overlay', 'focus']);
    expect([...colours].filter((name) => !kept.has(name) && !FADED.includes(name))).toEqual([]);
    for (const theme of THEMES) {
      const { set } = agedTokens(readConfig(), tokens, theme, 'heavy');
      const fresh = themeTokens(tokens, theme);
      for (const name of FADE_GROUPS.tints.names)
        expect(resolve(set, name), `${theme} ${name}`).not.toBe(resolve(fresh, name));
    }
  });

  it('caps the mottle where the text on a filled control would drop below 4.5:1', () => {
    for (const theme of THEMES)
      for (const level of levels) {
        const limit = mottleLimit(loudest, tokens, theme, level);
        expect(limit).toBeGreaterThan(0);
        expect(limit).toBeLessThanOrEqual(loudest.age.mottle);
      }
  });
});

describe('Age: worn rules', () => {
  const read = (stops: string) =>
    stops.split(', ').map((stop) => {
      const [opacity, at] = stop.split(' ');
      return [Number(opacity), parseFloat(at)];
    });

  it('mostly thins and thickens, breaks rarely, and never repeats a dash', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const stops = read(ruleStops(seed, 0.6, (o: number) => o.toFixed(2))!);
      const inked = stops.filter(([o]) => o > 0).map(([o]) => o);
      // The ink varies along the line, and is never thinner than 1 - 0.75 × the amount.
      expect(Math.max(...inked) - Math.min(...inked)).toBeGreaterThan(0.15);
      expect(Math.min(...inked)).toBeGreaterThanOrEqual(1 - 0.75 * 0.6 - 1e-9);
      // A break is two stops at 0; there are few of them over the whole period, and of 1–3px.
      const breaks = stops.filter(([o], i) => o === 0 && stops[i + 1]?.[0] === 0);
      expect(breaks.length).toBeLessThanOrEqual(6);
      // The stops are irregularly spaced: no single step makes up most of the line.
      const steps = stops
        .slice(1)
        .map(([, at], i) => at - stops[i][1])
        .filter((d) => d > 3);
      const counts = steps.reduce(
        (m, d) => m.set(d, (m.get(d) ?? 0) + 1),
        new Map<number, number>(),
      );
      expect(Math.max(...counts.values())).toBeLessThan(steps.length / 5);
      expect(stops.at(-1)![1]).toBe(RULE_PERIOD);
    }
    expect(ruleStops(1, 0, String)).toBeNull();
  });
});

describe('Age: states stay fresh', () => {
  const css = readFileSync('src/styles/wear/age.css', 'utf8');

  it('pins the focus ring and every state mark to the fresh inks', () => {
    for (const theme of THEMES)
      for (const level of levels) {
        const vars = ageInkVars(readConfig(), tokens, theme, level, (n: string) => n);
        const set = themeTokens(tokens, theme);
        expect(vars['--k-focus']).toBe(resolve(set, 'accent'));
        for (const name of STATE_INKS)
          expect(vars[`--k-age-fresh-${name}`]).toBe(resolve(set, name));
      }
    for (const state of AGE_STATES) expect(css).toContain(state);
    expect(css).toMatch(/--k-accent: var\(--k-age-fresh-accent\)/);
    // The worn table rule must not paint over the selected row's leading edge.
    expect(css).toMatch(
      /tr\[data-selected\]:not\(:last-child\) > :first-child \{\s*background-image: linear-gradient\(var\(--k-accent\), var\(--k-accent\)\), var\(--k-age-rule\)/,
    );
  });

  it('draws nothing aged on a disabled or focused control, and leaves focus styling alone', () => {
    expect(css).not.toMatch(/:focus(?!-visible\)|-within\))/);
    for (const rule of css.match(/^\s*[^{}\n]*\.k-button[^{}\n]*\{/gm) ?? [])
      expect(rule).toMatch(/:not\(:disabled/);
  });

  it('keeps a disabled button plainly unlike an aged primary one', () => {
    // A disabled button is the sunken surface with muted text; an aged primary keeps its ink.
    const rows = THEMES.map((theme) => {
      const set = themeTokens(tokens, theme);
      const aged = agedTokens(loudest, tokens, theme, 'heavy').colours.accent.aged;
      const sunken = resolve(set, 'surface-sunken');
      return {
        theme,
        // Colour distance of the fills, in OKLab (about 0.02 is just noticeable).
        fill: deltaE(aged, sunken),
        // Contrast between the two fills, and of each one's text on it.
        fills: ratio(aged, sunken),
        agedText: ratio(resolve(set, 'on-accent'), aged),
        disabledText: ratio(resolve(set, 'muted'), sunken),
      };
    });
    for (const row of rows) {
      expect(row.fill, row.theme).toBeGreaterThan(0.25);
      expect(row.fills, row.theme).toBeGreaterThan(3);
      expect(row.agedText, row.theme).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Age: generated and provided', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps src/styles/wear/age.css identical to what wear.config.json generates', () => {
    // Run `npm run wear` after changing wear.config.json or the generator.
    const config = readConfig();
    expect(readFileSync('src/styles/wear/age.css', 'utf8')).toBe(buildWear(config, tokens).age);
  }, 20000);

  it('only recolours and masks: no box changes size or place', () => {
    const css = readFileSync('src/styles/wear/age.css', 'utf8');
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^\s*[a-z-]+(?=:)/gm) ?? [];
    const allowed = new Set([
      // The card's border goes transparent (same width) and is drawn again by an absolute ::after.
      'position',
      'border-color',
      'border-bottom-color',
      'background-clip',
      'content',
      'inset',
      'border',
      'border-radius',
      'pointer-events',
      'mask',
      'background-image',
      'background-position',
      'background-size',
      'background-repeat',
    ]);
    expect(
      declarations.map((d) => d.trim()).filter((d) => !allowed.has(d) && !d.startsWith('--k-')),
    ).toEqual([]);
    // The ring is 1px, the width the card's own border already has.
    expect(css).toContain('border: 1px solid var(--k-border)');
    // Nothing here outside the guard for more contrast and forced colours.
    expect(css).toMatch(
      /@media \(not \(prefers-contrast: more\)\) and \(not \(forced-colors: active\)\)/,
    );
  });

  it('leaves no edge at any zoom: chips are cut out whole, and nothing lights an inner edge', () => {
    const css = readFileSync('src/styles/wear/age.css', 'utf8');
    // A chip is its own piece cut out of the box, not a square stitched to the rest of the box.
    expect(css).not.toContain('conic-gradient');
    for (const mask of css.match(/--k-age-chips-[\w-]+: [^;]+/g) ?? [])
      expect(mask).toMatch(/no-repeat exclude, linear-gradient\(#000, #000\)$/);
    // No inner shadow or paper-coloured band (DESIGN.md allows no highlight inside an edge), and
    // no second print of a label: misregistration was tried and dropped.
    expect(css).not.toContain('box-shadow');
    expect(css).not.toContain('text-shadow');
    expect(css).not.toContain('--k-age-shift');
  });

  it('defaults to none, nests, and turns off for more contrast and forced colours', () => {
    const media = (matches: string[]) =>
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: matches.includes(query),
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    media([]);
    const { unmount } = render(
      <KeiProvider data-testid="outer" age="heavy">
        <KeiProvider data-testid="inner" />
      </KeiProvider>,
    );
    expect(screen.getByTestId('outer')).toHaveAttribute('data-age', 'heavy');
    expect(screen.getByTestId('inner')).toHaveAttribute('data-age', 'heavy');
    unmount();
    render(<KeiProvider data-testid="plain" />);
    expect(screen.getByTestId('plain')).toHaveAttribute('data-age', 'none');
    for (const query of ['(prefers-contrast: more)', '(forced-colors: active)']) {
      media([query]);
      const { unmount: done } = render(<KeiProvider data-testid="scope" age="heavy" />);
      expect(screen.getByTestId('scope')).toHaveAttribute('data-age', 'none');
      done();
    }
  });
});
