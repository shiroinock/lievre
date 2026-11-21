import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkFormat, checkMissing, hasOptOut, isUserFacing } from './check-changelog.mjs';

test('部品・スタイル・トークン・端末の部品は、利用する側に届く', () => {
  for (const file of [
    'packages/react/src/components/form.tsx',
    'packages/react/src/styles/lievre.css',
    'packages/react/src/styles/wear/age.css',
    'packages/react/src/index.ts',
    'packages/tui/src/core/palette.ts',
    'packages/tokens/tokens.css',
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
    'docs/component-roadmap.md',
    'DESIGN.md',
  ]) {
    assert.equal(isUserFacing(file), false, file);
  }
});

test('部品を変えて CHANGELOG.md を変えないと、ファイルと直し方を出して落ちる', () => {
  const result = checkMissing({
    files: [
      'packages/react/src/components/form.tsx',
      'packages/react/src/test/components.test.tsx',
    ],
    body: '',
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /packages\/react\/src\/components\/form\.tsx/);
  assert.doesNotMatch(result.message, /components\.test\.tsx/);
  assert.match(result.message, /直し方/);
  assert.match(result.message, /未公開/);
  assert.match(result.message, /変更履歴：なし/);
});

test('CHANGELOG.md も変えていれば通る', () => {
  const result = checkMissing({
    files: ['packages/react/src/components/form.tsx', 'CHANGELOG.md'],
    body: '',
  });
  assert.equal(result.ok, true);
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
