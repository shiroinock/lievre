#!/usr/bin/env node
// Stops a PR that changes what apps receive without a fragment in changes/, stops new lines in the
// 「未公開」 of CHANGELOG.md (they belong in a fragment, so that parallel PRs never edit the same
// lines), and checks the headings of CHANGELOG.md and of every fragment.
//
//   node scripts/check-changelog.mjs [git diff range…]   (default: origin/main...HEAD)
//
// CI (.github/workflows/changelog.yml) passes HEAD^1 HEAD of the PR's merge commit, the PR
// description as PR_BODY, and GitHub sets GITHUB_HEAD_REF to the PR's branch.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PACKAGES = ['@lievre/tokens', '@lievre/react', '@lievre/tui'];
export const KINDS = ['見た目が変わる', '振る舞いが変わる', '足したもの', '直したもの'];
export const OPT_OUT = '変更履歴：なし';
export const FRAGMENTS = 'changes';
export const UNRELEASED = '未公開';

// Never reaches apps: tests, stories, the demo, Storybook docs and the tuning page.
const NOT_SHIPPED = [
  /\/src\/test\//,
  /\/src\/stories\//,
  /\.(test|stories)\.[cm]?[jt]sx?$/,
  /\.mdx$/,
  /^packages\/react\/src\/(docs|patterns|tune)\//,
  /^packages\/react\/src\/(App|main)\.tsx$/,
  /^packages\/react\/src\/styles\/demo\.css$/,
];

/** Whether a change to this file needs a fragment in changes/. */
export function isUserFacing(file) {
  if (file === 'packages/tokens/tokens.css') return true;
  // The migration command and the lint rules ship with @lievre/react too.
  if (/^packages\/react\/(bin|lint)\//.test(file)) return true;
  if (!/^packages\/[^/]+\/src\//.test(file)) return false;
  return !NOT_SHIPPED.some((p) => p.test(file));
}

/** Whether the file is a fragment: a Markdown file right under changes/, other than its README. */
export function isFragment(file) {
  return new RegExp(`^${FRAGMENTS}/[^/]+\\.md$`).test(file) && file !== `${FRAGMENTS}/README.md`;
}

/** The fragment's file name for a branch: `claude/component-chip` → `changes/component-chip.md`. */
export function fragmentName(branch) {
  const name = (branch ?? '')
    .replace(/^(claude|codex)\//, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${FRAGMENTS}/${name || '内容を表す名前'}.md`;
}

/**
 * Whether the PR description has the opt-out line (an ASCII colon also counts). A line inside a
 * fenced code block is an example, not the opt-out.
 */
export function hasOptOut(body = '') {
  const prose = (body ?? '').replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, '');
  return /^[ \t>*-]*変更履歴[ \t]*[：:][ \t]*なし/m.test(prose);
}

/** A fragment with these entries, as one would write it by hand. */
export function renderEntries(entries, { headingLevel = 3 } = {}) {
  const h = '#'.repeat(headingLevel);
  const blocks = [];
  for (const pkg of PACKAGES) {
    const mine = entries.filter((e) => e.pkg === pkg);
    if (mine.length === 0) continue;
    blocks.push(`${h} ${pkg}`);
    for (const kind of KINDS) {
      const items = mine.filter((e) => e.kind === kind);
      if (items.length > 0) blocks.push(`${h}# ${kind}`, items.map((e) => e.text).join('\n'));
    }
  }
  return blocks.join('\n\n');
}

const EXAMPLE = renderEntries([
  {
    pkg: '@lievre/react',
    kind: '足したもの',
    text: '- 分類や選んだ値を示す `Chip` と `ChipGroup`。（#6）',
  },
]);

const RULES = [
  `  パッケージは ${PACKAGES.join('・')}、区分は ${KINDS.join('・')} から選ぶ。`,
  '  項目は「- 」で始めて利用する側の言葉で書き、末尾に PR の番号を付ける（例：（#6））。',
  '  1つの PR で複数のパッケージや区分に書くときは、見出しを並べる。書き方は changes/README.md。',
].join('\n');

/** How to write a fragment, for the messages. */
export function howToWrite(name = fragmentName()) {
  return [
    `  ${name} を足し、次の形で書く（見出しは CHANGELOG.md と同じ。1つの PR で1ファイル）：`,
    '',
    ...EXAMPLE.split('\n').map((l) => (l ? `    ${l}` : '')),
    '',
    RULES,
  ].join('\n');
}

/** Fails with the files and how to fix it when no fragment was added or changed. */
export function checkMissing({ files, fragments = [], body, branch }) {
  const facing = files.filter(isUserFacing);
  if (facing.length === 0 || fragments.length > 0 || hasOptOut(body)) {
    return { ok: true, facing };
  }
  const message = [
    `${FRAGMENTS}/ に変更履歴の断片がありません。次のファイルは利用する側に届きます：`,
    ...facing.map((f) => `  - ${f}`),
    '',
    '直し方（どちらか）：',
    '  1. 断片を足す。',
    howToWrite(fragmentName(branch)).replace(/^ {2}/gm, '     '),
    `  2. 利用する側に見えない変更なら、PR の説明に「${OPT_OUT}（理由）」の1行を書く。`,
    '     説明を直すと、この検査はもう一度走る。',
  ].join('\n');
  return { ok: false, facing, message };
}

/**
 * The entries of a fragment, or of the body of one release in CHANGELOG.md: `### package`,
 * `#### kind` and `- ` items (lines indented under an item belong to it). HTML comments are hints,
 * not entries. Each problem has its line and how to fix it.
 */
export function parseEntries(text, { needNumber = true } = {}) {
  const entries = [];
  const problems = [];
  let pkg = null;
  let kind = null;
  let last = null;
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''))
    .split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    if (line.trim() === '') return;
    const h = /^(#{1,6}) (.+?)\s*$/.exec(line);
    if (h) {
      const [, marks, title] = h;
      last = null;
      if (marks === '###') {
        pkg = PACKAGES.includes(title) ? title : null;
        kind = null;
        if (pkg === null) {
          problems.push(
            `${n} 行目：「### ${title}」はパッケージの名前でない。${PACKAGES.join('・')} のどれかにする。`,
          );
        }
      } else if (marks === '####') {
        kind = KINDS.includes(title) ? title : null;
        if (kind === null) {
          problems.push(
            `${n} 行目：「#### ${title}」は区分でない。${KINDS.join('・')} のどれかにする。`,
          );
        } else if (pkg === null) {
          problems.push(`${n} 行目：「#### ${title}」がパッケージの見出し（###）の下にない。`);
          kind = null;
        }
      } else {
        problems.push(
          `${n} 行目：見出し「${line}」は使わない。### パッケージと #### 区分だけにする。`,
        );
      }
      return;
    }
    if (/^- /.test(line)) {
      last = null;
      if (kind === null) {
        problems.push(
          `${n} 行目：項目が区分の見出し（####）の下にない。「${KINDS.join('」「')}」のどれかの下に移す。`,
        );
        return;
      }
      last = { pkg, kind, text: line, line: n };
      entries.push(last);
      return;
    }
    if (/^\s{2,}\S/.test(line) && last !== null) {
      last.text += `\n${line}`;
      return;
    }
    problems.push(
      `${n} 行目：「${line.trim()}」は項目でない。「- 」で始め、区分の見出しの下に書く。`,
    );
  });
  if (needNumber) {
    for (const e of entries) {
      if (!/（#\d+）$/.test(e.text)) {
        problems.push(`${e.line} 行目：項目の末尾に PR の番号がない。「（#12）」の形で付ける。`);
      }
    }
  }
  if (entries.length === 0 && problems.length === 0) {
    problems.push('項目がない。書くことがないなら、ファイルごと消す。');
  }
  return { entries, problems };
}

/** The PR number an entry ends with, for ordering. */
export function numberOf(entry) {
  const m = /（#(\d+)）$/.exec(entry.text);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/**
 * CHANGELOG.md cut at the 「## 未公開」 section: what comes before it, its body (without the
 * heading), and what comes after it. Without the section, `body` is null and `after` is the text
 * from the first release on.
 */
export function splitChangelog(text) {
  const lines = text.split('\n');
  const isRelease = (l) => /^## /.test(l) && l !== '## 書き方';
  const at = lines.findIndex((l) => l === `## ${UNRELEASED}`);
  if (at === -1) {
    const first = lines.findIndex(isRelease);
    const cut = first === -1 ? lines.length : first;
    return {
      before: lines.slice(0, cut).join('\n'),
      body: null,
      after: lines.slice(cut).join('\n'),
    };
  }
  const next = lines.findIndex((l, i) => i > at && isRelease(l));
  const end = next === -1 ? lines.length : next;
  return {
    before: lines.slice(0, at).join('\n'),
    body: lines.slice(at + 1, end).join('\n'),
    after: lines.slice(end).join('\n'),
  };
}

/** The items under 「## 未公開」 in CHANGELOG.md. */
export function unreleasedEntries(text) {
  const { body } = splitChangelog(text);
  return body === null || body.trim() === ''
    ? []
    : parseEntries(body, { needNumber: false }).entries;
}

/**
 * Fails when the PR added items under 「## 未公開」 in CHANGELOG.md: they go in a fragment now. The
 * message carries the fragment to paste. Rewording an item that is already there passes.
 */
export function checkUnreleased({ before = '', after, branch }) {
  const old = unreleasedEntries(before);
  const now = unreleasedEntries(after);
  if (now.length <= old.length) return { ok: true };
  const known = new Set(old.map((e) => `${e.pkg}\n${e.kind}\n${e.text}`));
  const added = now.filter((e) => !known.has(`${e.pkg}\n${e.kind}\n${e.text}`));
  const name = fragmentName(branch);
  const message = [
    `CHANGELOG.md の「${UNRELEASED}」に項目が足されています。変更履歴は ${FRAGMENTS}/ の断片に書きます（並行する PR が同じ行で食い違わないように）。`,
    '',
    '直し方：',
    `  1. CHANGELOG.md に足した行を消す（main の CHANGELOG.md に戻す）。`,
    `  2. 同じ中身で ${name} を足す：`,
    '',
    ...renderEntries(added)
      .split('\n')
      .map((l) => (l ? `    ${l}` : '')),
    '',
    RULES,
  ].join('\n');
  return { ok: false, added, message };
}

/** Problems in the headings of CHANGELOG.md, each with its line and how to fix it. */
export function checkFormat(text) {
  const problems = [];
  const lines = text.split('\n');
  let release = null; // the current `## …`
  let pkg = null;
  let kind = null;
  let lastKind = -1;
  let items = 0;
  const releases = [];

  const closeKind = (n) => {
    if (kind !== null && items === 0) {
      problems.push(
        `${n} 行目の前：「#### ${kind}」に項目がない。書くことのない区分は見出しごと消す。`,
      );
    }
  };

  lines.forEach((line, i) => {
    const n = i + 1;
    const h = /^(#{2,6}) (.+)$/.exec(line);
    if (h) {
      const [, marks, title] = h;
      closeKind(n);
      if (marks === '##') {
        release = title;
        pkg = null;
        kind = null;
        if (title === '書き方') return;
        if (title !== UNRELEASED && !/^\d+\.\d+\.\d+（\d{4}-\d{2}-\d{2}）$/.test(title)) {
          problems.push(
            `${n} 行目：「## ${title}」は版の見出しにならない。「## ${UNRELEASED}」か「## 0.3.0（2026-12-01）」の形にする。`,
          );
        }
        releases.push(title);
      } else if (marks === '###') {
        kind = null;
        lastKind = -1;
        pkg = title;
        if (!PACKAGES.includes(title)) {
          problems.push(
            `${n} 行目：「### ${title}」はパッケージの名前でない。${PACKAGES.join('・')} のどれかにする。`,
          );
        }
      } else if (marks === '####') {
        const at = KINDS.indexOf(title);
        items = 0;
        kind = title;
        if (at === -1) {
          problems.push(
            `${n} 行目：「#### ${title}」は区分でない。${KINDS.join('・')} のどれかにする。`,
          );
        } else if (at <= lastKind) {
          problems.push(
            `${n} 行目：「#### ${title}」の順が違う。区分は ${KINDS.join('→')} の順に並べる。`,
          );
        }
        if (pkg === null && release !== '書き方') {
          problems.push(`${n} 行目：「#### ${title}」がパッケージの見出し（###）の下にない。`);
        }
        lastKind = Math.max(lastKind, at);
      } else {
        problems.push(
          `${n} 行目：見出し「${line}」は使わない。## 版、### パッケージ、#### 区分だけにする。`,
        );
      }
      return;
    }
    if (/^- /.test(line) && kind !== null) items += 1;
    if (/^- /.test(line) && release !== null && release !== '書き方' && kind === null) {
      problems.push(
        `${n} 行目：項目が区分の見出し（####）の下にない。「${KINDS.join('」「')}」のどれかの下に移す。`,
      );
    }
  });
  closeKind(lines.length);

  const unreleased = releases.indexOf(UNRELEASED);
  if (unreleased > 0) {
    problems.push(`「## ${UNRELEASED}」は版の見出しのいちばん上に置く。`);
  }
  if (releases.filter((r) => r === UNRELEASED).length > 1) {
    problems.push(`「## ${UNRELEASED}」が2つある。1つにまとめる。`);
  }
  return problems;
}

/** The fragments in changes/, as `{ file, text }`. */
export function readFragments(root = new URL('..', import.meta.url)) {
  const dir = new URL(`${FRAGMENTS}/`, root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => `${FRAGMENTS}/${name}`)
    .filter(isFragment)
    .sort()
    .map((file) => ({ file, text: readFileSync(new URL(file, root), 'utf8') }));
}

/** Problems in every fragment, each with its file and line. */
export function checkFragments(fragments) {
  return fragments.flatMap(({ file, text }) =>
    parseEntries(text).problems.map((p) => `${file} の ${p}`),
  );
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8' });

/** The commit the range starts from: `A B` → A, `A...B` → their merge base, `A..B` → A. */
function baseOf(range) {
  const [first, second] = range;
  if (second !== undefined) return first;
  if (first.includes('...')) return git(['merge-base', ...first.split('...')]).trim();
  if (first.includes('..')) return first.split('..')[0];
  return first;
}

function main(args) {
  const range = args.length > 0 ? args : ['origin/main...HEAD'];
  const list = (filter) =>
    git(['diff', '--name-only', ...filter, ...range])
      .split('\n')
      .filter(Boolean);
  const files = list([]);
  // A deleted fragment is not one this PR wrote.
  const fragments = list(['--diff-filter=d']).filter(isFragment);
  const branch = process.env.GITHUB_HEAD_REF || git(['branch', '--show-current']).trim();
  const fail = (message) => {
    console.error(message);
    process.exit(1);
  };

  const result = checkMissing({ files, fragments, body: process.env.PR_BODY, branch });
  if (!result.ok) fail(result.message);

  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  let before = '';
  try {
    before = git(['show', `${baseOf(range)}:CHANGELOG.md`]);
  } catch {
    // CHANGELOG.md did not exist at the base.
  }
  const unreleased = checkUnreleased({ before, after: changelog, branch });
  if (!unreleased.ok) fail(unreleased.message);

  const problems = checkFormat(changelog);
  if (problems.length > 0) {
    fail(['CHANGELOG.md の書き方が崩れています：', ...problems.map((p) => `  - ${p}`)].join('\n'));
  }
  const broken = checkFragments(readFragments());
  if (broken.length > 0) {
    fail(
      [
        '変更履歴の断片の書き方が崩れています：',
        ...broken.map((p) => `  - ${p}`),
        '',
        howToWrite(),
      ].join('\n'),
    );
  }
  console.log(
    result.facing.length === 0
      ? '利用する側に届くファイルは変わっていません。'
      : `利用する側に届くファイル ${result.facing.length} 件：${FRAGMENTS}/ の断片か PR の説明で確かめました。`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
