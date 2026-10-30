// The rename to lievre (MIGRATION.md): no file may keep the old names, and the documents keep to
// the words the author chose.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../../..');

// Files that may write the old names, each with its reason. Everything else is checked.
const ABOUT_OLD_NAMES: [RegExp, string][] = [
  [/^MIGRATION\.md$/, '移る手順。古い名前と新しい名前を並べる'],
  [/^packages\/react\/bin\/lievre-migrate\.mjs$/, '移行の codemod。古い名前を探して書き換える'],
  [/^packages\/react\/lint\/biome\/no-legacy-prefix\.grit$/, '移行の lint（Biome）。古い頭を探す'],
  [
    /^packages\/react\/lint\/index\.js$/,
    '移行の lint（ESLint・Oxlint の no-legacy-prefix）。古い頭を探す',
  ],
  [/^packages\/react\/src\/test\/migrate\.test\.tsx$/, 'codemod のテスト。古い名前の入力を書く'],
  [
    /^packages\/react\/src\/test\/consumer-lint\.test\.tsx$/,
    'no-legacy-prefix のテスト。古い名前の入力を書く',
  ],
  [/^packages\/react\/src\/test\/naming\.test\.tsx$/, 'この検査そのもの'],
  [/^packages\/react\/bench\/agent\/results\//, 'ベンチマークの過去の結果。記録なので書き換えない'],
  [/(^|\/)package-lock\.json$/, 'npm が書き出す。過去の版の解決が残る'],
];
// Data gathered from outside (the Pinterest pins and their categories).
const OUTSIDE_DATA = [/^references\/pinterest\//, /^references\/design-references\.json$/];

const OLD_NAMES: [RegExp, string][] = [
  [
    /(?<![A-Za-z])(?:kei|KEI)(?![a-z])|Kei(?![a-z])/,
    'kei・KEI・Kei は lievre（見出しとロゴは Lièvre）に',
  ],
  [/(?<![\w$@/-])k-[a-z]/, 'クラスの頭 k- は lv- に'],
  [/\.k-/, 'クラスの頭 .k- は .lv- に'],
  [/--k-[a-z]/, 'CSS 変数の頭 --k- は --lv- に'],
];

const text = (file: string) => {
  const s = readFileSync(join(root, file), 'utf8');
  // The plan written before the rename keeps the old names on purpose.
  const own = file === 'docs/tui-foundation.md' ? s.replace(/### 改名[\s\S]*?(?=\n## )/, '') : s;
  // The GitHub repository keeps its name until the author renames it.
  return own.replaceAll('shiroinock/kei-design-system', 'shiroinock/<repository>');
};

// Text files only: git grep -I skips binaries such as the fonts and screenshots. --untracked also
// takes files not yet added (but not the ignored ones), so a new file fails here before it is
// committed, the same as in CI. Run from the repository root, so it sees the same files from any
// workspace.
const files = execFileSync('git', ['grep', '-I', '-l', '--untracked', '-e', '', '--', '.'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

describe('the rename to lievre', () => {
  it('leaves no old name in any file', () => {
    const found: string[] = [];
    for (const file of files) {
      if ([...ABOUT_OLD_NAMES.map(([p]) => p), ...OUTSIDE_DATA].some((p) => p.test(file))) continue;
      text(file)
        .split('\n')
        .forEach((line, i) => {
          for (const [pattern, fix] of OLD_NAMES)
            if (pattern.test(line))
              found.push(`${file}:${i + 1}：${fix}直してください。${line.trim().slice(0, 80)}`);
        });
    }
    expect(found).toEqual([]);
  });

  it('keeps 計器 out of the documents and the screens', () => {
    // The author's choice: the grid and tokens stay, the word does not.
    const found = files
      .filter((file) => !OUTSIDE_DATA.some((p) => p.test(file)))
      .filter((file) => file !== 'packages/react/src/test/naming.test.tsx')
      .filter((file) => text(file).includes('計器'));
    expect(found, '「計器」を「メーター」や「測った値」などに言い換えてください').toEqual([]);
  });
});
