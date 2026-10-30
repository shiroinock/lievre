import { renderToString } from 'ink';
import stringWidth from 'string-width';
import { describe, expect, it } from 'vitest';
import {
  PAIRS,
  Screen,
  contrast,
  glyphs,
  palette,
  resolved,
  type Level,
  type ThemeName,
} from '../src/index.js';

const themes: ThemeName[] = ['paper', 'ink'];
const levels: Level[] = ['truecolor', '256', '16', 'none'];
const ANSI = /\u001b\[[0-9;]*m/g;

const draw = (level: Level, theme: ThemeName, set = 'unicode') =>
  renderToString(
    <Screen p={palette(level, theme)} g={glyphs({ LIEVRE_GLYPHS: set })} focus="save" row={1} />,
    { columns: 60 },
  );

// truecolor takes the web values; 256 colors the nearest xterm color that still passes.
describe('contrast', () => {
  for (const theme of themes)
    for (const level of ['truecolor', '256'] as Level[])
      it(`${level} ${theme}: every pair reaches its minimum`, () => {
        const p = palette(level, theme);
        for (const [fg, bg, min] of PAIRS)
          expect(
            contrast(resolved(p, fg)!, resolved(p, bg)!),
            `${fg} on ${bg}`,
          ).toBeGreaterThanOrEqual(min);
      });
});

describe('the sample screen', () => {
  for (const theme of themes)
    for (const level of levels)
      it(`${level} ${theme}: keeps every line on the cell grid`, () => {
        const lines = draw(level, theme).replace(ANSI, '').split('\n');
        expect(lines.join('\n')).toContain('請求書の取り込み');
        // Japanese takes 2 cells, Latin 1: the card's right edge lines up on every row.
        const framed = lines.filter((line) => /^[│╭╰]/.test(line));
        expect(new Set(framed.map((line) => stringWidth(line))).size).toBe(1);
      });

  it('paints no color without one (NO_COLOR)', () => {
    expect(draw('none', 'paper')).not.toMatch(/\u001b\[(3|4)8;/);
  });

  it('paints no surfaces with 16 colors', () => {
    expect(draw('16', 'paper')).not.toMatch(/\u001b\[(4[0-7]|10[0-7]|48;)/);
  });

  it('keeps to ASCII for terminals that draw ambiguous characters wide', () => {
    const text = draw('16', 'paper', 'ascii').replace(ANSI, '');
    const nonAscii = [...text].filter((c) => c.codePointAt(0)! > 0x7e && stringWidth(c) < 2);
    expect(nonAscii).toEqual([]);
  });
});
