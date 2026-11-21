import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { release } from './changelog-release.mjs';
import { checkFormat, splitChangelog } from './check-changelog.mjs';

const changelog = `# 変更履歴

前書き。

## 書き方

- 決まり

## 未公開

### @lievre/react

#### 足したもの

- Field（#32）

## 0.2.0（2026-12-01）

### @lievre/tokens

#### 足したもの

- トークン（#22）
`;

const fragments = [
  {
    file: 'changes/tui-motion-ink.md',
    text: '### @lievre/tui\n\n#### 足したもの\n\n- Banner（#4）\n',
  },
  {
    file: 'changes/component-chip.md',
    text: [
      '### @lievre/react',
      '',
      '#### 直したもの',
      '',
      '- Chip の幅（#6）',
      '',
      '#### 足したもの',
      '',
      '- Chip。',
      '  折り返す。（#6）',
      '',
      '### @lievre/tokens',
      '',
      '#### 見た目が変わる',
      '',
      '- 角（#6）',
      '',
    ].join('\n'),
  },
  {
    file: 'changes/a-earlier.md',
    text: '### @lievre/react\n\n#### 足したもの\n\n- Menu（#3）\n',
  },
];

test('断片と「未公開」を版の見出しの下に、パッケージと区分の順でまとめる', () => {
  const { text, count } = release({ changelog, fragments, version: '0.3.0', date: '2026-12-08' });
  assert.equal(count, 6);
  assert.equal(
    text,
    `# 変更履歴

前書き。

## 書き方

- 決まり

## 0.3.0（2026-12-08）

### @lievre/tokens

#### 見た目が変わる

- 角（#6）

### @lievre/react

#### 足したもの

- Field（#32）
- Menu（#3）
- Chip。
  折り返す。（#6）

#### 直したもの

- Chip の幅（#6）

### @lievre/tui

#### 足したもの

- Banner（#4）

## 0.2.0（2026-12-01）

### @lievre/tokens

#### 足したもの

- トークン（#22）
`,
  );
  assert.deepEqual(checkFormat(text), []);
});

test('「未公開」がなくても、版の見出しのいちばん上にまとめる', () => {
  const without = changelog.replace(/## 未公開[\s\S]*?(?=## 0\.2\.0)/, '');
  const { text } = release({
    changelog: without,
    fragments: fragments.slice(0, 1),
    version: '0.3.0',
    date: '2026-12-08',
  });
  assert.match(text, /- 決まり\n\n## 0\.3\.0（2026-12-08）\n\n### @lievre\/tui\n/);
  assert.match(text, /- Banner（#4）\n\n## 0\.2\.0/);
});

test('今の CHANGELOG.md の「未公開」は、まとめても中身が変わらない', () => {
  const now = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  const { body } = splitChangelog(now);
  if (body === null) return;
  const { text } = release({ changelog: now, fragments: [], version: '9.9.9', date: '2026-12-08' });
  const after = splitChangelog(text.replace('## 9.9.9（2026-12-08）', '## 未公開'));
  assert.equal(after.body.trim(), body.trim());
});

test('版・日付・崩れた断片・まとめるものがないときは止める', () => {
  const cases = [
    [{ version: 'v0.3.0' }, /0\.3\.0 の形/],
    [{ date: '12/08' }, /2026-12-01 の形/],
    [{ version: '0.2.0' }, /もうある/],
    [
      { fragments: [{ file: 'changes/x.md', text: '- 区分の外（#1）\n' }] },
      /changes\/x\.md の 1 行目/,
    ],
    [
      {
        changelog: changelog.replace(/## 未公開[\s\S]*?(?=## 0\.2\.0)/, ''),
        fragments: [],
      },
      /まとめるものがない/,
    ],
  ];
  for (const [over, pattern] of cases) {
    assert.throws(
      () => release({ changelog, fragments, version: '0.3.0', date: '2026-12-08', ...over }),
      pattern,
    );
  }
});

test('空の「未公開」は消して、断片だけをまとめる', () => {
  const empty = changelog.replace('### @lievre/react\n\n#### 足したもの\n\n- Field（#32）\n\n', '');
  const { text } = release({
    changelog: empty,
    fragments: fragments.slice(0, 1),
    version: '0.3.0',
    date: '2026-12-08',
  });
  assert.doesNotMatch(text, /未公開/);
  assert.match(
    text,
    /## 0\.3\.0（2026-12-08）\n\n### @lievre\/tui\n\n#### 足したもの\n\n- Banner（#4）\n\n## 0\.2\.0/,
  );
});
