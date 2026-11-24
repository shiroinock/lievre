// @lievre/tui counts columns with string-width; Lievre Term draws each character in as many cells
// as its width table (@lievre/fonts/widths.json) says. The two must agree code point by code point,
// or a frame drawn in the terminal comes out ragged.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import stringWidth from 'string-width';
import { describe, expect, it } from 'vitest';
import { PUA } from '../src/core/glyphs';

type Table = { default: number; zero: [number, number][]; wide: [number, number][] };
const require = createRequire(import.meta.url);
const table: Table = JSON.parse(readFileSync(require.resolve('@lievre/fonts/widths.json'), 'utf8'));

function widthOf(cp: number) {
  const within = (ranges: [number, number][]) => ranges.some(([a, b]) => a <= cp && cp <= b);
  return within(table.zero) ? 0 : within(table.wide) ? 2 : table.default;
}

describe('Lievre Term の幅の表', () => {
  // Characters this Node does not know yet (Unicode newer than its ICU) are left out: string-width
  // reads Unicode properties from the runtime, so it counts a mark added in Unicode 17 or 18 as one
  // column until Node learns it, while the table, made from Unicode 18, says zero.
  const unassigned = /^\p{Cn}$/u;
  it('string-width と、この Node が知っているすべての字で一致する', () => {
    const differ: string[] = [];
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const ch = String.fromCodePoint(cp);
      if (unassigned.test(ch)) continue;
      const got = stringWidth(ch);
      if (got !== widthOf(cp)) differ.push(`U+${cp.toString(16).toUpperCase()}`);
    }
    expect(differ.slice(0, 20), `${differ.length} 字で食い違っています`).toEqual([]);
  });

  it('lievre の私用領域の字は 1 セル', () => {
    for (const ch of Object.values(PUA)) expect(widthOf(ch.codePointAt(0)!)).toBe(1);
  });
});
