import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { buildFonts, OUT, SANS_SHIFT, WEIGHTS, sansSubsets } from '../../scripts/build-fonts.mjs';

describe('fonts.css', () => {
  it('matches what scripts/build-fonts.mjs writes', () => {
    // Run `npm run fonts -w packages/react` after changing the script or updating fontsource.
    expect(readFileSync(OUT, 'utf8')).toBe(buildFonts());
  });

  it('moves Plex Sans JP down by the em box offset, keeping the line box', () => {
    expect(SANS_SHIFT).toBe(0.07);
    const css = buildFonts();
    expect(css).toContain('ascent-override: 113%;');
    expect(css).toContain('descent-override: 37%;');
  });

  it('gives Lievre Mono the same line middle, so mixed lines keep their height', () => {
    // 110.6% / 19.4% at 5/6 size: 0.9217em above and 0.1617em below, middle 0.38em up.
    const mono = /font-family: 'Lievre Mono';[^}]*/.exec(buildFonts())![0];
    expect(mono).toContain('ascent-override: 110.6%;');
    expect(mono).toContain('descent-override: 19.4%;');
  });

  it('defines every subset of every weight', () => {
    const css = buildFonts();
    const faces = css.match(/font-family: 'Lievre Sans';/g) ?? [];
    expect(faces.length).toBe(WEIGHTS.reduce((n, w) => n + sansSubsets(w).length, 0));
    expect(css.match(/font-family: 'Lievre Mono';/g)?.length).toBe(WEIGHTS.length);
  });
});
