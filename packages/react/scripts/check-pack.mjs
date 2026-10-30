// Checks what `npm pack` puts in the package: `npm run check:pack` after `npm run build:lib`.
// The package must stand alone for apps: everything the exports point at, and nothing from src/.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
// prepack and postpack print their own lines before and after the JSON.
const [{ files }] = JSON.parse(out.slice(out.indexOf('\n[') + 1, out.lastIndexOf(']') + 1));
const packed = new Set(files.map((f) => f.path));

const targets = (value) =>
  typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
const required = [
  'package.json',
  'README.md',
  'DESIGN.md',
  ...Object.values(pkg.exports)
    .flatMap(targets)
    .filter((path) => !path.includes('*'))
    .map((path) => path.replace(/^\.\//, '')),
];
const problems = [
  ...required.filter((path) => !packed.has(path)).map((path) => `${path} が入っていません。`),
  ...[...packed]
    .filter((path) => /^(src|scripts|bench|\.storybook)\//.test(path))
    .map((path) => `${path} は利用者に要りません。package.json の files を見直してください。`),
];
if (![...packed].some((path) => path.startsWith('lint/biome/')))
  problems.push('lint/biome/ の .grit が入っていません。');

if (problems.length) {
  console.error(
    `npm pack の中身に問題があります（先に npm run build:lib を実行してください）。\n${problems.join('\n')}`,
  );
  process.exit(1);
}
console.log(`npm pack: ${packed.size} files, ${required.length} required entries present`);
