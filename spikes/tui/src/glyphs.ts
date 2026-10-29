// The characters KEI draws with. A terminal app cannot ask which font the terminal uses, so the
// set is chosen by the user: KEI_GLYPHS=unicode (default) | kei-term | ascii.
//
// Box drawing (U+2500–) and most block elements are East Asian Width "Ambiguous": a terminal set
// to draw ambiguous characters double-wide (common with Japanese fonts) gives them 2 cells, and
// every frame drawn with them falls apart. KEI_AMBIGUOUS=wide therefore switches to ASCII,
// whose width never changes. The private use area is Ambiguous too, so KEI Term has the same
// limit.
import type { BoxStyle } from 'cli-boxes';

export type GlyphSet = 'unicode' | 'kei-term' | 'ascii';

export type Glyphs = {
  set: GlyphSet;
  /** Card frame. */
  frame: BoxStyle;
  /** Rule under a table's header. */
  rule: string;
  /** Ends of a button: filled caps drawn in the button's color, or plain padding. */
  capLeft: string;
  capRight: string;
  /** Focus ring around a button, in the focus color. */
  focusLeft: string;
  focusRight: string;
  /** Left edge of a selected row (KEI draws an ultramarine line there on the web too). */
  selectedBar: string;
  /** Status marks: the word always follows, so the mark only repeats it. */
  ok: string;
  warn: string;
  stop: string;
};

/** KEI Term private use code points, U+E500–U+E53F (outside Nerd Fonts 3.5.1). See font/build.py. */
export const PUA = {
  topLeft: '',
  topRight: '',
  bottomLeft: '',
  bottomRight: '',
  horizontal: '',
  vertical: '',
  capLeft: '',
  capRight: '',
  focusLeft: '',
  focusRight: '',
} as const;

const unicode: Glyphs = {
  set: 'unicode',
  frame: {
    topLeft: '╭',
    top: '─',
    topRight: '╮',
    right: '│',
    bottomRight: '╯',
    bottom: '─',
    bottomLeft: '╰',
    left: '│',
  },
  rule: '─',
  capLeft: ' ',
  capRight: ' ',
  // LEFT / RIGHT ONE EIGHTH BLOCK: a thin line with most of a cell between it and the button.
  focusLeft: '▏',
  focusRight: '▕',
  selectedBar: '▌',
  ok: '✓',
  warn: '!',
  stop: '✕',
};

const keiTerm: Glyphs = {
  ...unicode,
  set: 'kei-term',
  frame: {
    topLeft: PUA.topLeft,
    top: PUA.horizontal,
    topRight: PUA.topRight,
    right: PUA.vertical,
    bottomRight: PUA.bottomRight,
    bottom: PUA.horizontal,
    bottomLeft: PUA.bottomLeft,
    left: PUA.vertical,
  },
  capLeft: PUA.capLeft,
  capRight: PUA.capRight,
  focusLeft: PUA.focusLeft,
  focusRight: PUA.focusRight,
};

const ascii: Glyphs = {
  set: 'ascii',
  frame: {
    topLeft: '+',
    top: '-',
    topRight: '+',
    right: '|',
    bottomRight: '+',
    bottom: '-',
    bottomLeft: '+',
    left: '|',
  },
  rule: '-',
  capLeft: ' ',
  capRight: ' ',
  focusLeft: '[',
  focusRight: ']',
  selectedBar: '>',
  ok: 'o',
  warn: '!',
  stop: 'x',
};

export function glyphs(env = process.env): Glyphs {
  if (env.KEI_AMBIGUOUS === 'wide') return ascii;
  if (env.KEI_GLYPHS === 'kei-term') return keiTerm;
  if (env.KEI_GLYPHS === 'ascii' || env.TERM === 'dumb') return ascii;
  return unicode;
}
