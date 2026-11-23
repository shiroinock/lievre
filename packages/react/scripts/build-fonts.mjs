// Writes src/styles/fonts.css, the @font-face rules that @lievre/react/fonts.css ships:
//   npm run fonts -w packages/react
// The font files stay in the fontsource packages: the rules point at them by package path, and
// the app's bundler resolves them (the same way it resolves `@fontsource/...` imports).
//
// Lievre Sans is IBM Plex Sans JP moved down in its line box. Plex Sans JP's ascent and descent
// (1.06em / 0.44em) put the middle of the line 0.31em above the baseline, but the ideographic
// em box (-0.12em to 0.88em) has its middle 0.38em above it, so kanji and kana sat 0.07em high.
// The overrides move 0.07em from the descent to the ascent: the line box keeps its height and the
// em box lands in its middle. Each weight has 123 subsets, so the rules are written, not typed.
//
// Lievre Mono is IBM Plex Mono scaled from 0.6em to 0.5em wide, so one Latin character is
// exactly half of a Japanese one (the same 1:2 grid as PlemolJP). Japanese falls through to
// Lievre Sans, whose kana and kanji are 1em wide. Its line box keeps Plex Mono's height (1.3em at
// 5/6 size) with the same middle as Lievre Sans, 0.38em above the baseline: Japanese in mono text
// sits in the middle too, and a mono cell, or mono figures inside a line of sans, share the
// baseline of the sans next to them without growing the line box.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(root, 'src/styles/fonts.css');

/** Plex Sans JP's own metrics in em (hhea, line gap 0). */
export const PLEX_SANS_JP = { ascent: 1.06, descent: 0.44, ideographicBottom: -0.12 };
/** How far Lievre Sans moves the glyphs down, in em: the em box's middle minus the line's. */
export const SANS_SHIFT = round(
  (1 + 2 * PLEX_SANS_JP.ideographicBottom) / 2 - (PLEX_SANS_JP.ascent - PLEX_SANS_JP.descent) / 2,
);
/** Plex Mono's own metrics in em, and the scale that makes Latin 0.5em wide. */
export const PLEX_MONO = { ascent: 1.025, descent: 0.275, scale: 5 / 6 };
/** The middle of both line boxes above the baseline, in em of the text's size. */
export const LINE_MIDDLE = round(0.5 + PLEX_SANS_JP.ideographicBottom);
export const WEIGHTS = [400, 500, 600];

/** ascent-override / descent-override that keep a font's line height and put its middle at LINE_MIDDLE. Overrides are scaled by size-adjust, so they are given unscaled. */
function overrides({ ascent, descent, scale = 1 }) {
  const height = (ascent + descent) * scale;
  return {
    ascent: percent((height / 2 + LINE_MIDDLE) / scale),
    descent: percent((height / 2 - LINE_MIDDLE) / scale),
  };
}

const MONO_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, ' +
  'U+0329, U+2000-200F, U+2010-2011, U+2022, U+2030, U+2039-203A, U+20AC, U+2122, U+2191, ' +
  'U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

function round(n) {
  return Math.round(n * 1e4) / 1e4;
}
const percent = (em) => `${Math.round(em * 1000) / 10}%`;

/** The subsets of one weight of Plex Sans JP: the woff2 file name and its unicode-range. */
export function sansSubsets(weight) {
  const css = readFileSync(require.resolve(`@fontsource/ibm-plex-sans-jp/${weight}.css`), 'utf8');
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => {
    const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(body)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1];
    if (!file || !range)
      throw new Error(`Plex Sans JP ${weight} の @font-face を読めません：${body}`);
    return { file, range: range.trim() };
  });
}

export function buildFonts() {
  const { ascent, descent } = overrides(PLEX_SANS_JP);
  const m = overrides(PLEX_MONO);
  const sans = WEIGHTS.flatMap((weight) =>
    sansSubsets(weight).map(
      ({ file, range }) => `@font-face {
  font-family: 'Lievre Sans';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  ascent-override: ${ascent};
  descent-override: ${descent};
  line-gap-override: 0%;
  src: url('@fontsource/ibm-plex-sans-jp/files/${file}') format('woff2');
  unicode-range: ${range};
}
`,
    ),
  );
  const mono = WEIGHTS.map(
    (weight) => `@font-face {
  font-family: 'Lievre Mono';
  font-style: normal;
  font-display: swap;
  font-weight: ${weight};
  size-adjust: 83.333%;
  ascent-override: ${m.ascent};
  descent-override: ${m.descent};
  line-gap-override: 0%;
  src: url('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff2') format('woff2');
  unicode-range: ${MONO_RANGE};
}
`,
  );
  return `/*
 * Written by scripts/build-fonts.mjs (npm run fonts -w packages/react). Do not edit.
 * Shipped as @lievre/react/fonts.css. The files come from @fontsource/ibm-plex-sans-jp and
 * @fontsource/ibm-plex-mono, which the app installs.
 *
 * Lievre Sans: IBM Plex Sans JP with the ideographic em box in the middle of the line box
 * (glyphs ${SANS_SHIFT}em lower, same line height).
 * Lievre Mono: IBM Plex Mono at 5/6 size, so Latin is half as wide as Japanese, with its line
 * box's middle at the same height (${LINE_MIDDLE}em above the baseline).
 */
${mono.join('\n')}
${sans.join('\n')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT, buildFonts());
  console.log(`${OUT} を書き出しました（Lievre Sans の字を ${SANS_SHIFT}em 下げる）。`);
}
