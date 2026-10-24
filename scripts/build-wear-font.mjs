// Bakes worn glyphs for the current salt: `npm run wear:font` (same salt rules as `npm run wear`).
// Needs Python 3 with fontTools and brotli. Results are cached per salt under wear-fonts/,
// and wear-fonts/fonts.css always points at the current salt.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveSalt } from './build-wear.mjs';
import { hashString } from '../src/wear/seed.mjs';

const salt = resolveSalt();
const python = process.env.KEI_WEAR_PYTHON || 'python3';
try {
  execFileSync(python, ['-c', 'import fontTools, brotli'], { stdio: 'ignore' });
} catch {
  console.error(
    `${python} に fontTools と brotli が必要です：${python} -m pip install fonttools brotli\n` +
      '別の Python を使う場合は KEI_WEAR_PYTHON で指定してください。',
  );
  process.exit(1);
}
const dir = `wear-fonts/${hashString(salt).toString(16)}`;
const started = Date.now();
if (!existsSync(`${dir}/report.json`))
  execFileSync(python, ['scripts/wear/font.py', salt, dir], { stdio: 'inherit' });
// KEI Mono only covers the Latin range in fonts.css; the worn copy takes exactly the same range.
const monoRange = readFileSync('src/styles/fonts.css', 'utf8').match(
  /font-family: 'KEI Mono';[\s\S]*?unicode-range: ([^;]+);/,
)[1];
const css = readFileSync(`${dir}/fonts.css`, 'utf8')
  .replace(/url\(\.\//g, `url(./${dir.slice('wear-fonts/'.length)}/`)
  .replace(
    /(font-family: 'KEI Worn Mono';[\s\S]*?unicode-range: )[^;]+;/g,
    (_, head) => `${head}${monoRange};`,
  );
writeFileSync('wear-fonts/fonts.css', css);
const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf8'));
console.log(
  `salt "${salt}": ${report.files} files, ${(report.bytes / 1048576).toFixed(2)} MiB, ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
