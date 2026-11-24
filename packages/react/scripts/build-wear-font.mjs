// Bakes worn glyphs from wear.config.json (salt and outline): `npm run wear:font`.
// Needs Python 3 with fontTools and brotli (`npm run wear:setup`). Results are cached per salt and strength under
// wear-fonts/; wear-fonts/fonts.css always points at the current values, and wear-fonts/current.json
// records them so src/test/wear.test.tsx can tell when the fonts are out of date.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { outlineEnv, readConfig } from './build-wear.mjs';
import { hashString } from '../src/wear/seed.mjs';
import { missingMessage, wearPython } from './wear/python.mjs';

// Bump when scripts/wear/font.py changes how it writes the fonts.
const FONT_VERSION = 3;
const { salt, outline } = readConfig();
const python = wearPython();
try {
  execFileSync(python, ['-c', 'import fontTools, brotli'], { stdio: 'ignore' });
} catch {
  console.error(
    `${missingMessage(python)}\n別の Python を使う場合は LIEVRE_WEAR_PYTHON で指定してください。`,
  );
  process.exit(1);
}
// The cache key covers everything that changes the outlines, not only the salt.
const strength = JSON.stringify(outline);
const env = { ...process.env, ...outlineEnv(outline) };
const dir = `wear-fonts/${hashString(`${salt}:${strength}:${FONT_VERSION}`).toString(16)}`;
const started = Date.now();
if (!existsSync(`${dir}/report.json`))
  execFileSync(python, ['scripts/wear/font.py', salt, dir], { stdio: 'inherit', env });
// The worn mono is Plex Mono's Latin at 5/6 size (the Lievre Mono that lievre used before
// Lievre Term): only the Latin range, so Japanese falls through to the worn sans.
const monoRange =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, ' +
  'U+0329, U+2000-200F, U+2010-2011, U+2022, U+2030, U+2039-203A, U+20AC, U+2122, U+2191, ' +
  'U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const css = readFileSync(`${dir}/fonts.css`, 'utf8')
  .replace(/url\(\.\//g, `url(./${dir.slice('wear-fonts/'.length)}/`)
  .replace(
    /(font-family: 'Lievre Worn Mono';[\s\S]*?unicode-range: )[^;]+;/g,
    (_, head) => `${head}${monoRange};`,
  );
// Advance widths must match the originals glyph for glyph, or the 1:2 grid and figure columns break.
execFileSync(python, ['scripts/wear/font.py', 'check', dir], { stdio: 'inherit' });
writeFileSync('wear-fonts/fonts.css', css);
writeFileSync('wear-fonts/current.json', JSON.stringify({ salt, outline, dir }, null, 2) + '\n');
const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf8'));
console.log(
  `salt "${salt}": ${report.files} files, ${(report.bytes / 1048576).toFixed(2)} MiB, ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
