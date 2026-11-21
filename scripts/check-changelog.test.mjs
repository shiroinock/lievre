import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkFormat,
  checkFragments,
  checkMissing,
  checkUnreleased,
  fragmentName,
  hasOptOut,
  isFragment,
  isUserFacing,
  parseEntries,
  readFragments,
} from './check-changelog.mjs';

test('部品・スタイル・トークン・端末の部品は、利用する側に届く', () => {
  for (const file of [
    'packages/react/src/components/form.tsx',
    'packages/react/src/styles/lievre.css',
    'packages/react/src/styles/wear/age.css',
    'packages/react/src/index.ts',
    'packages/tui/src/core/palette.ts',
    'packages/tokens/tokens.css',
    'packages/react/bin/lievre-migrate.mjs',
    'packages/react/lint/index.js',
    'packages/react/lint/biome/no-legacy-prefix.grit',
  ]) {
    assert.equal(isUserFacing(file), true, file);
  }
});

test('テスト・Story・デモ・パッケージの外は、利用する側に届かない', () => {
  for (const file of [
    'packages/react/src/test/components.test.tsx',
    'packages/react/src/test/layout/baseline.ts',
    'packages/react/src/stories/Button.stories.tsx',
    'packages/react/src/docs/Introduction.mdx',
    'packages/react/src/patterns/Operations.tsx',
    'packages/react/src/tune/Tune.tsx',
    'packages/react/src/App.tsx',
    'packages/react/src/styles/demo.css',
    'packages/tui/test/tui.test.tsx',
    'packages/tokens/tokens.json',
    'packages/react/scripts/stylelint-lievre.mjs',
    'docs/component-roadmap.md',
    'DESIGN.md',
  ]) {
    assert.equal(isUserFacing(file), false, file);
  }
});

test('部品を変えて断片を足さないと、ファイルと断片の書き方を出して落ちる', () => {
  const result = checkMissing({
    files: [
      'packages/react/src/components/form.tsx',
      'packages/react/src/test/components.test.tsx',
    ],
    body: '',
    branch: 'claude/component-chip',
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /packages\/react\/src\/components\/form\.tsx/);
  assert.doesNotMatch(result.message, /components\.test\.tsx/);
  assert.match(result.message, /直し方/);
  assert.match(result.message, /changes\/component-chip\.md/);
  assert.match(result.message, /### @lievre\/react/);
  assert.match(result.message, /#### 足したもの/);
  assert.match(result.message, /変更履歴：なし/);
});

test('断片を足すか直していれば通る', () => {
  const result = checkMissing({
    files: ['packages/react/src/components/form.tsx', 'changes/component-chip.md'],
    fragments: ['changes/component-chip.md'],
    body: '',
  });
  assert.equal(result.ok, true);
});

test('CHANGELOG.md を変えただけでは通らない', () => {
  const result = checkMissing({
    files: ['packages/react/src/components/form.tsx', 'CHANGELOG.md'],
    body: '',
  });
  assert.equal(result.ok, false);
});

test('断片は changes/ の直下の .md で、README.md は断片でない', () => {
  assert.equal(isFragment('changes/component-chip.md'), true);
  assert.equal(isFragment('changes/README.md'), false);
  assert.equal(isFragment('changes/sub/a.md'), false);
  assert.equal(isFragment('changes/a.txt'), false);
  assert.equal(isFragment('docs/changes/a.md'), false);
});

test('断片の名前は枝の名前から作る', () => {
  assert.equal(fragmentName('claude/component-chip'), 'changes/component-chip.md');
  assert.equal(fragmentName('feature/a b'), 'changes/feature-a-b.md');
  assert.equal(fragmentName(''), 'changes/内容を表す名前.md');
});

test('テストや文書だけの変更は、CHANGELOG.md がなくても通る', () => {
  const result = checkMissing({
    files: ['packages/react/src/stories/Field.stories.tsx', 'docs/component-roadmap.md'],
    body: undefined,
  });
  assert.equal(result.ok, true);
});

test('PR の説明の「変更履歴：なし」の1行で通る', () => {
  const files = ['packages/react/src/components/form.tsx'];
  for (const body of [
    '## 概要\n\n変更履歴：なし（型の名前を内部で揃えただけ）\n',
    '変更履歴: なし',
    '- 変更履歴：なし（テストの土台）',
    '> 変更履歴：なし',
    '```sh\nnpm test\n```\n\n変更履歴：なし（コードの塊のあと）',
  ]) {
    assert.equal(hasOptOut(body), true, body);
    assert.equal(checkMissing({ files, body }).ok, true, body);
  }
});

test('文の途中や引用符の中の「変更履歴：なし」では通らない', () => {
  for (const body of [
    'この PR は 変更履歴：なし ではありません',
    '`変更履歴：なし` で始まる1行を書くと通ります',
    '変更履歴：あり',
    '書き方の例：\n\n```md\n変更履歴：なし（理由）\n```\n',
    '- 変更履歴\n：なし',
  ]) {
    assert.equal(hasOptOut(body), false, body);
  }
});

const ok = `# 変更履歴

## 書き方

- 決まり

## 未公開

### @lievre/react

#### 見た目が変わる

- 必須の印（#32）

#### 足したもの

- Field（#32）

### @lievre/tui

#### 直したもの

- 幅（#40）

## 0.2.0（2026-12-01）

### @lievre/tokens

#### 足したもの

- トークン（#22）
`;

test('決まりどおりの CHANGELOG.md は通る', () => {
  assert.deepEqual(checkFormat(ok), []);
});

test('今の CHANGELOG.md は決まりどおり', () => {
  const text = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.deepEqual(checkFormat(text), []);
});

test('パッケージ・区分の名前の誤り、区分の順、空の区分を止める', () => {
  const cases = [
    [ok.replace('### @lievre/tui', '### lievre-tui'), /パッケージの名前でない/],
    [ok.replace('#### 足したもの\n\n- Field', '#### 追加\n\n- Field'), /区分でない/],
    [
      ok.replace(
        '#### 見た目が変わる\n\n- 必須の印（#32）\n\n#### 足したもの\n\n- Field（#32）',
        '#### 足したもの\n\n- Field（#32）\n\n#### 見た目が変わる\n\n- 必須の印（#32）',
      ),
      /順が違う/,
    ],
    [ok.replace('#### 直したもの\n\n- 幅（#40）\n', '#### 直したもの\n'), /項目がない/],
    [ok.replace('## 0.2.0（2026-12-01）', '## v0.2.0'), /版の見出しにならない/],
    [ok.replace('### @lievre/react\n\n', '### @lievre/react\n\n- 区分の外\n\n'), /区分の見出し/],
    [ok.replace('## 未公開', '## 0.3.0（2026-12-08）\n\n## 未公開'), /いちばん上/],
  ];
  for (const [text, pattern] of cases) {
    const problems = checkFormat(text);
    assert.ok(
      problems.some((p) => pattern.test(p)),
      `${pattern} が出ない：${problems.join(' / ')}`,
    );
  }
});

const fragment = `### @lievre/react

#### 見た目が変わる

- Chip の角（#6）

#### 足したもの

- Chip と ChipGroup。
  ChipGroup は折り返す。（#6）

### @lievre/tui

#### 足したもの

- Banner（#6）
`;

test('断片から、パッケージ・区分・本文を読む', () => {
  const { entries, problems } = parseEntries(fragment);
  assert.deepEqual(problems, []);
  assert.deepEqual(
    entries.map(({ pkg, kind, text }) => [pkg, kind, text]),
    [
      ['@lievre/react', '見た目が変わる', '- Chip の角（#6）'],
      ['@lievre/react', '足したもの', '- Chip と ChipGroup。\n  ChipGroup は折り返す。（#6）'],
      ['@lievre/tui', '足したもの', '- Banner（#6）'],
    ],
  );
});

test('断片の HTML のコメントは読まない', () => {
  const { entries, problems } = parseEntries(`<!-- 書き方の例\n### @lievre/x\n-->\n${fragment}`);
  assert.deepEqual(problems, []);
  assert.equal(entries.length, 3);
});

test('断片の誤りを、ファイルと行と直し方を付けて止める', () => {
  const cases = [
    [fragment.replace('### @lievre/tui', '### lievre-tui'), /パッケージの名前でない/],
    [fragment.replace('#### 見た目が変わる', '#### 見た目'), /区分でない/],
    ['#### 足したもの\n\n- A（#1）\n', /パッケージの見出し（###）の下にない/],
    ['### @lievre/react\n\n- A（#1）\n', /区分の見出し（####）の下にない/],
    [fragment.replace('- Banner（#6）', '- Banner'), /PR の番号がない/],
    [
      fragment.replace('### @lievre/react', '## @lievre/react'),
      /見出し「## @lievre\/react」は使わない/,
    ],
    [fragment.replace('- Banner（#6）', 'Banner（#6）'), /項目でない/],
    ['<!-- 空 -->\n', /項目がない/],
  ];
  for (const [text, pattern] of cases) {
    const problems = checkFragments([{ file: 'changes/a.md', text }]);
    assert.ok(
      problems.some((p) => p.startsWith('changes/a.md の ') && pattern.test(p)),
      `${pattern} が出ない：${problems.join(' / ')}`,
    );
  }
});

test('changes/ の断片は決まりどおり', () => {
  assert.deepEqual(checkFragments(readFragments()), []);
});

test('CHANGELOG.md の「未公開」に項目を足すと、貼る断片を出して落ちる', () => {
  const after = ok.replace('- Field（#32）', '- Field（#32）\n- Chip（#6）');
  const result = checkUnreleased({ before: ok, after, branch: 'claude/component-chip' });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.added.map((e) => e.text),
    ['- Chip（#6）'],
  );
  assert.match(result.message, /changes\/component-chip\.md/);
  assert.match(result.message, /### @lievre\/react\n\n {4}#### 足したもの\n\n {4}- Chip（#6）/);
  assert.doesNotMatch(result.message, /Field/);
});

test('「未公開」の項目を直す・消すだけなら通る', () => {
  for (const after of [
    ok.replace('- Field（#32）', '- Field と Fieldset（#32）'),
    ok.replace('#### 足したもの\n\n- Field（#32）\n\n', ''),
    ok.replace(
      /## 未公開[\s\S]*?(?=## 0\.2\.0)/,
      '## 0.3.0（2026-12-08）\n\n### @lievre/react\n\n#### 足したもの\n\n- Field（#32）\n- Chip（#6）\n\n',
    ),
  ]) {
    assert.equal(checkUnreleased({ before: ok, after }).ok, true, after);
  }
});

test('「未公開」がなかったところに作って項目を足しても落ちる', () => {
  const before = ok.replace(/## 未公開[\s\S]*?(?=## 0\.2\.0)/, '');
  assert.equal(checkUnreleased({ before, after: ok }).ok, false);
});
