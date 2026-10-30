// The rename to lievre (MIGRATION.md): no file may keep the old names, and the documents keep to
// the words the author chose.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../../..');

// Files that are about the old names: the migration itself, and records of the past.
const ABOUT_OLD_NAMES = [
  /^MIGRATION\.md$/,
  /^packages\/react\/bin\/lievre-migrate\.mjs$/,
  /^packages\/react\/src\/test\/(migrate|naming|consumer-lint)\.test\.tsx$/,
  /^packages\/react\/bench\/agent\/results\//,
  /(^|\/)package-lock\.json$/,
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

// Text files only: git grep -I skips binaries such as the fonts and screenshots.
const files = execFileSync('git', ['grep', '-I', '-l', '-e', '', '--', '.'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

describe('the rename to lievre', () => {
  it('leaves no old name in any file', () => {
    const found: string[] = [];
    for (const file of files) {
      if ([...ABOUT_OLD_NAMES, ...OUTSIDE_DATA].some((p) => p.test(file))) continue;
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
