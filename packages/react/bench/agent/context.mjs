// How much an agent must read to solve each task, in estimated tokens.
//   node bench/agent/context.mjs [--root <checkout>] [--external] [--json out.json]
// --root measures another checkout (for example main, after `pnpm run build:lib` there).
// --external also downloads the other systems' docs listed in external-docs.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const root = resolve(arg('--root') ?? join(import.meta.dirname, '../..'));

// Claude's tokenizer is not public. Roughly: 4 ASCII characters or 1 Japanese character per token.
// Good enough to compare sizes; not a bill.
export const estimateTokens = (text) => {
  let ascii = 0;
  let other = 0;
  for (const ch of text) ch.codePointAt(0) < 128 ? ascii++ : other++;
  return Math.round(ascii / 4 + other);
};

// The files an agent opens in a consumer app: the README for setup, then each .d.ts that
// declares a component it uses. Agents read whole files, so whole files are counted.
const tasks = {
  T1: ['primitives', 'system'],
  T2: ['data', 'primitives'],
  T3: ['dialog', 'primitives', 'system'],
  T4: ['primitives', 'foundation', 'system'],
  T5: ['data', 'primitives'],
};
// DESIGN.md sits at the repository root in the workspaces; pnpm pack copies it into the package.
const read = (file) => {
  const path = [join(root, file), join(root, '../..', file)].find((p) => existsSync(p));
  return path ? readFileSync(path, 'utf8') : null;
};
const size = (files) => files.reduce((sum, f) => sum + estimateTokens(read(f) ?? ''), 0);

if (!existsSync(join(root, 'lib/index.d.ts'))) {
  console.error(
    `${root}/lib がありません。そのチェックアウトで pnpm run build:lib を実行してください。`,
  );
  process.exit(1);
}
const rows = Object.entries(tasks).map(([task, modules]) => {
  const types = ['README.md', 'lib/index.d.ts', ...modules.map((m) => `lib/components/${m}.d.ts`)];
  return {
    task,
    types: size(types),
    typesAndDesign: size([...types, 'DESIGN.md']),
    llms: read('llms.txt') === null ? null : size(['llms.txt']),
  };
});
const all = {
  allTypes: size([
    'README.md',
    'DESIGN.md',
    'lib/index.d.ts',
    ...['data', 'dialog', 'foundation', 'primitives', 'system'].map(
      (m) => `lib/components/${m}.d.ts`,
    ),
  ]),
  source: size([
    'src/components/data.tsx',
    'src/components/dialog.tsx',
    'src/components/foundation.tsx',
    'src/components/primitives.tsx',
    'src/components/system.tsx',
  ]),
  implementation: size(['lib/lievre.js']),
};

console.log(`lievre（${root}）`);
console.log('| 課題 | README＋型 | ＋DESIGN.md | llms.txt だけ |');
console.log('| --- | --: | --: | --: |');
for (const r of rows)
  console.log(`| ${r.task} | ${r.types} | ${r.typesAndDesign} | ${r.llms ?? 'なし'} |`);
console.log(
  `\n型と文書すべて ${all.allTypes}、部品のソース ${all.source}、lib/lievre.js ${all.implementation}（トークンの見積もり）`,
);

const result = { date: new Date().toISOString(), lievre: { tasks: rows, ...all } };
if (process.argv.includes('--external')) {
  const docs = JSON.parse(readFileSync(join(import.meta.dirname, 'external-docs.json'), 'utf8'));
  result.external = {};
  console.log('\n| システム | 文書 | URL | 見積もり |');
  console.log('| --- | --- | --- | --: |');
  for (const [system, pages] of Object.entries(docs.systems)) {
    result.external[system] = {};
    for (const [page, url] of Object.entries(pages)) {
      if (!url) continue;
      let tokens = null;
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok) tokens = estimateTokens(await res.text());
      } catch {
        // Offline or blocked: leave it empty rather than guessing.
      }
      result.external[system][page] = { url, tokens };
      console.log(`| ${system} | ${page} | ${url} | ${tokens ?? '取得できず'} |`);
    }
  }
}
const out = arg('--json');
if (out) writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
