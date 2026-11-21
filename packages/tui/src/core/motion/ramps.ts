// Ramps from empty to full, one per glyph set. Every character is East Asian Width N or Na, so
// it takes 1 cell in every terminal: the block shades ░▒▓█ are Ambiguous and are never used.
// test/motion-core.test.tsx checks that each character stays 1 cell even when ambiguous ones are wide.
import type { GlyphSet } from '../glyphs.js';

// Braille patterns by the number of raised dots, 0 to 8 (U+2800 block, width N).
const BRAILLE = ' ⠁⠃⠇⡇⡏⡟⡿⣿';
// Printable ASCII by how much of the cell it covers.
const ASCII = ' .:-=+*#%@';

/** 字の組ごとの、薄い順に並べた字。先頭は空白。 */
export const RAMPS: Record<GlyphSet, readonly string[]> = {
  unicode: [...BRAILLE],
  'lievre-term': [...BRAILLE],
  ascii: [...ASCII],
};

/** 明るさ（0〜1）に当たる字。 */
export function rampChar(ramp: readonly string[], value: number): string {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return ramp[Math.round(v * (ramp.length - 1))];
}
