// The rename to lievre (MIGRATION.md): no file may keep the old names, and the documents keep to
// the words the author chose.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
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
  [/(^|\/)pnpm-lock\.yaml$/, 'pnpm が書き出す。過去の版の解決が残る'],
  [/(^|\/)package-lock\.json$/, 'npm が書き出す（spikes/ はまだ npm）。過去の版の解決が残る'],
];
// Data gathered from outside (the Pinterest pins and their categories).
const OUTSIDE_DATA = [/^references\/pinterest\//, /^references\/design-references\.json$/];

const OLD_NAMES: [RegExp, string][] = [
  [
    /(?<![A-Za-z])(?:kei|KEI)(?![a-z])|Kei(?![a-z])/,
    'kei・KEI・Kei は lievre（見出しとロゴは Lièvre）に',
  ],
  [/(?<![\w$@/-])k-[a-z$]/, 'クラスの頭 k- は lv- に'],
  [/\.k-/, 'クラスの頭 .k- は .lv- に'],
  [/--k-[a-z]/, 'CSS 変数の頭 --k- は --lv- に'],
];

const text = (file: string) => {
  const s = readFileSync(join(root, file), 'utf8');
  // The plan written before the rename keeps the old names on purpose.
  return file === 'docs/tui-foundation.md' ? s.replace(/### 改名[\s\S]*?(?=\n## )/, '') : s;
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

  it('leaves no old name in a file name', () => {
    const allowed = ABOUT_OLD_NAMES.map(([p]) => p);
    const found = files.filter(
      (file) =>
        !allowed.some((p) => p.test(file)) &&
        !OUTSIDE_DATA.some((p) => p.test(file)) &&
        OLD_NAMES.some(([pattern]) => pattern.test(file)),
    );
    expect(found, 'ファイルの名前の kei を lievre に変えてください').toEqual([]);
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

// Links to this repository (the lint rules' docs URLs, the documents): the file and the heading they
// point at must be on main, or the link lands on the wrong page after a move or a rename.
const REPOSITORY = 'https://github.com/shiroinock/lievre';
// The path stops at the punctuation that ends a sentence or a Markdown link. The anchor keeps to the
// characters a heading's slug keeps, so 「…#lint。」 and <…#lint> read as #lint.
const LINK =
  /https:\/\/github\.com\/shiroinock\/lievre(?:\/(?:blob|tree)\/main\/([^\s'"`()#<>「」。、]*))?(?:#([\p{L}\p{N}_%-]+))?/gu;
// The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens.
const slug = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

const brokenLinks = (file: string, content: string) => {
  const found: string[] = [];
  for (const [url, rawPath = '', anchor] of content.matchAll(LINK)) {
    const path = rawPath.replace(/[.,:;!?]+$/, '');
    const target = join(root, path);
    const page =
      existsSync(target) && statSync(target).isDirectory() ? join(target, 'README.md') : target;
    if (!existsSync(page)) {
      found.push(`${file}：${url} の ${path || 'README.md'} がありません。今の場所を指してください`);
      continue;
    }
    if (!anchor) continue;
    const headings = readFileSync(page, 'utf8')
      .split('\n')
      .filter((line) => /^#{1,6} /.test(line))
      .map((line) => slug(line.replace(/^#+ /, '')));
    if (!headings.includes(decodeURIComponent(anchor)))
      found.push(
        `${file}：${url} の見出し #${anchor} が ${page.slice(root.length + 1)} にありません。見出しのある README を指してください（${REPOSITORY}/tree/main/<フォルダ>#<見出し>）`,
      );
  }
  return found;
};

describe('the links to this repository', () => {
  it('point at a file and a heading that are there', () => {
    const found: string[] = [];
    for (const file of files) {
      if (OUTSIDE_DATA.some((p) => p.test(file))) continue;
      if (/^packages\/react\/bench\/agent\/results\//.test(file)) continue;
      found.push(...brokenLinks(file, readFileSync(join(root, file), 'utf8')));
    }
    expect(found).toEqual([]);
  });

  // Written from REPOSITORY, so the scan above does not read these as links of this file.
  it('stops a missing file or heading, and passes the ones that are there', () => {
    const react = `${REPOSITORY}/tree/main/packages/react`;
    for (const ok of [
      REPOSITORY,
      `${REPOSITORY}/pull/26`,
      `${REPOSITORY}/blob/main/DESIGN.md`,
      `${REPOSITORY}/blob/main/DESIGN.md.`,
      `${react}#lint`,
      `${react}#lint。`,
      `<${react}#lint>`,
      `[lint](${react}#lint).`,
      `「${react}#lint」`,
    ])
      expect(brokenLinks('ok', ok), ok).toEqual([]);
    for (const bad of [
      `${REPOSITORY}#lint`,
      `${REPOSITORY}/blob/main/nope.md`,
      `${react}#nolint`,
      `${react}#nolint。`,
    ])
      expect(brokenLinks('bad', bad), bad).toHaveLength(1);
  });
});
