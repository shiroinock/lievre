import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hasOptOut } from './check-changelog.mjs';
import {
  HEADING,
  findOverlaps,
  main,
  overlap,
  parseDeclared,
  pickTarget,
  report,
} from './check-overlap.mjs';

const body = (...paths) =>
  `## 概要\n\n部品\n\n## ${HEADING}\n\n${paths.map((p) => `- \`${p}\``).join('\n')}\n\n## 確かめたこと\n\n- \`npm test\`\n`;

const pr = (number, over = {}) => ({
  number,
  title: `部品 ${number}`,
  headRefName: `claude/p${number}`,
  baseRefName: 'main',
  isDraft: false,
  body: body(),
  files: [],
  ...over,
});

test('「触るファイル」の節の項目だけを読む', () => {
  const text = [
    '## 概要',
    '- `packages/react/src/App.tsx` は概要の中なので読まない',
    `## ${HEADING}`,
    '<!-- - `ヒントの中.md` -->',
    '- `packages/react/src/components/menu.tsx`',
    '* packages/react/src/styles/lievre.css（メニューの節）',
    '- [ ] ./docs/component-roadmap.md',
    '```',
    '- `コードの中.md`',
    '```',
    '### 細かい分け（同じ節の続き）',
    '- `packages/react/src/stories/Menu*`',
    '## 確かめたこと',
    '- `npm test`',
  ].join('\n');
  assert.deepEqual(parseDeclared(text), [
    'packages/react/src/components/menu.tsx',
    'packages/react/src/styles/lievre.css',
    'docs/component-roadmap.md',
    'packages/react/src/stories/Menu*',
  ]);
  assert.equal(parseDeclared('## 概要\n\n- `a.ts`'), null, '節がなければ null');
});

test('テンプレートのままでは何も宣言せず、変更履歴の検査もすり抜けない', () => {
  const template = readFileSync(
    new URL('../.github/pull_request_template.md', import.meta.url),
    'utf8',
  );
  assert.deepEqual(parseDeclared(template), []);
  assert.equal(hasOptOut(template), false);
});

test('同じファイル・ディレクトリ・* の重なりを見つける', () => {
  assert.deepEqual(overlap(['a/b.ts', 'c.ts'], ['a/b.ts']), ['a/b.ts']);
  assert.deepEqual(
    overlap(['packages/react/src/components/menu.tsx'], ['packages/react/src/components/']),
    ['packages/react/src/components/menu.tsx'],
  );
  assert.deepEqual(
    overlap(['packages/react/src/stories/Menu.stories.tsx'], ['packages/react/src/stories/Menu*']),
    ['packages/react/src/stories/Menu.stories.tsx'],
  );
  assert.deepEqual(
    overlap(['packages/react/src/stories/Menu*'], ['packages/react/src/stories/Chip*']),
    [],
  );
  assert.deepEqual(overlap(['packages/react/src/*'], ['packages/react/src/styles/']), [
    'packages/react/src/*',
  ]);
  assert.deepEqual(
    overlap(['packages/react/src/stories/'], ['packages/react/src/styles/x.css']),
    [],
  );
});

test('宣言どうし・宣言と実際の変更の重なりを知らせ、直し方を書く', () => {
  const mine = pr(1, { body: body('packages/react/src/styles/lievre.css') });
  const others = [
    pr(2, { files: [{ path: 'packages/react/src/styles/lievre.css' }] }),
    pr(3, { body: body('packages/react/src/styles/'), isDraft: true }),
    pr(4, { body: body('packages/tui/src/core/palette.ts') }),
  ];
  const found = findOverlaps(mine, others);
  assert.deepEqual(
    found.map((f) => f.other.number),
    [2, 3],
  );
  const text = report(mine, found);
  assert.match(text, /#2 部品 2/);
  assert.match(text, /#3 部品 3（claude\/p3、下書き）/);
  assert.match(text, /向こうはまだ宣言だけ/);
  assert.doesNotMatch(text, /#4/);
  assert.match(text, /直し方/);
  assert.match(text, /積む/);
});

test('書き出したファイルと CHANGELOG.md は、別に「書き出し直せば済む」と出す', () => {
  const mine = pr(1, {
    files: [{ path: 'packages/react/llms.txt' }, { path: 'CHANGELOG.md' }],
  });
  const other = pr(2, {
    files: [
      { path: 'packages/react/llms.txt' },
      { path: 'CHANGELOG.md' },
      { path: 'packages/tokens/tokens.json' },
    ],
  });
  const found = findOverlaps(mine, [other]);
  assert.deepEqual(found[0].mind, []);
  const text = report(mine, found);
  assert.match(text, /重なるファイルはありません/);
  assert.match(text, /書き出し直せば済むもの：packages\/react\/llms\.txt、CHANGELOG\.md/);
  assert.match(text, /npm run llms/);
});

test('積んだ PR どうしの重なりは、知らせない', () => {
  const lower = pr(1, { files: [{ path: 'a.ts' }] });
  const upper = pr(2, { baseRefName: 'claude/p1', files: [{ path: 'a.ts' }] });
  assert.deepEqual(findOverlaps(upper, [lower]), []);
  assert.deepEqual(findOverlaps(lower, [upper]), []);
});

test('本文に「触るファイル」がない PR には、書き方を知らせる', () => {
  const text = report(pr(5, { body: '## 概要\n\nなし' }), []);
  assert.match(text, /「## 触るファイル」がありません/);
  assert.match(text, /pull_request_template\.md/);
});

const git =
  (branch, diff = '') =>
  (args) => {
    if (args[0] === 'branch') return `${branch}\n`;
    return args.includes('HEAD') && args.length === 3 ? '' : diff;
  };

test('引数がなければ今の枝の PR を、手元の未 push の変更と合わせて調べる', () => {
  const prs = [pr(1, { files: [{ path: 'a.ts' }] }), pr(2)];
  const target = pickTarget([], prs, { git: git('claude/p1', 'b.ts\n') });
  assert.equal(target.number, 1);
  assert.deepEqual(target.files, ['a.ts', 'b.ts']);

  const none = pickTarget([], prs, { git: git('claude/new', 'c.ts\n') });
  assert.equal(none.number, 0);
  assert.deepEqual(none.files, ['c.ts']);
  assert.match(report(none, []), /PR なし/);
  assert.doesNotMatch(report(none, []), /がありません。/, 'PR のない枝に本文の注意は出さない');

  assert.equal(pickTarget(['#2'], prs, { git: git('main') }).number, 2);
  assert.throws(() => pickTarget(['9'], prs, { git: git('main') }), /#9 は開いた PR にありません/);
});

test('--all は重なる組だけを出す', () => {
  const prs = [
    pr(1, { files: [{ path: 'a.ts' }] }),
    pr(2, { files: [{ path: 'a.ts' }] }),
    pr(3, { files: [{ path: 'z.ts' }] }),
  ];
  const out = [];
  main(['--all'], { gh: () => JSON.stringify(prs), log: (s) => out.push(s) });
  assert.match(out[0], /#1 部品 1 と重なる PR があります/);
  assert.match(out[0], /#2 部品 2/);
  assert.doesNotMatch(out[0], /#3/);

  const quiet = [];
  main(['--all'], { gh: () => JSON.stringify([prs[2]]), log: (s) => quiet.push(s) });
  assert.match(quiet[0], /重なるファイルはありません/);
});
