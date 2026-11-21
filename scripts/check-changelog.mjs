#!/usr/bin/env node
// Stops a PR that changes what apps receive without a line in CHANGELOG.md, and checks the
// headings of CHANGELOG.md.
//
//   node scripts/check-changelog.mjs [git diff range…]   (default: origin/main...HEAD)
//
// CI (.github/workflows/changelog.yml) passes HEAD^1 HEAD of the PR's merge commit, and the PR
// description as PR_BODY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PACKAGES = ['@lievre/tokens', '@lievre/react', '@lievre/tui'];
export const KINDS = ['見た目が変わる', '振る舞いが変わる', '足したもの', '直したもの'];
export const OPT_OUT = '変更履歴：なし';

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

/** Whether a change to this file needs a line in CHANGELOG.md. */
export function isUserFacing(file) {
  if (file === 'packages/tokens/tokens.css') return true;
  if (!/^packages\/[^/]+\/src\//.test(file)) return false;
  return !NOT_SHIPPED.some((p) => p.test(file));
}

/** Whether the PR description has the opt-out line (an ASCII colon also counts). */
export function hasOptOut(body = '') {
  return /^[\s>*-]*変更履歴\s*[：:]\s*なし/m.test(body);
}

/** Fails with the files and how to fix it when CHANGELOG.md was left out. */
export function checkMissing({ files, body }) {
  const facing = files.filter(isUserFacing);
  if (facing.length === 0 || files.includes('CHANGELOG.md') || hasOptOut(body)) {
    return { ok: true, facing };
  }
  const message = [
    'CHANGELOG.md が変わっていません。次のファイルは利用する側に届きます：',
    ...facing.map((f) => `  - ${f}`),
    '',
    '直し方（どちらか）：',
    '  1. CHANGELOG.md の「未公開」の、パッケージ（@lievre/react など）の見出しの下に、1行足す。',
    `     区分は「${KINDS.join('」「')}」から選び、末尾に PR の番号を付ける（例：（#32））。`,
    `  2. 利用する側に見えない変更なら、PR の説明に「${OPT_OUT}（理由）」の1行を書く。`,
    '     説明を直すと、この検査はもう一度走る。',
  ].join('\n');
  return { ok: false, facing, message };
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
        if (title !== '未公開' && !/^\d+\.\d+\.\d+（\d{4}-\d{2}-\d{2}）$/.test(title)) {
          problems.push(
            `${n} 行目：「## ${title}」は版の見出しにならない。「## 未公開」か「## 0.3.0（2026-12-01）」の形にする。`,
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

  const unreleased = releases.indexOf('未公開');
  if (unreleased > 0) {
    problems.push('「## 未公開」は版の見出しのいちばん上に置く。');
  }
  if (releases.filter((r) => r === '未公開').length > 1) {
    problems.push('「## 未公開」が2つある。1つにまとめる。');
  }
  return problems;
}

function main(args) {
  const range = args.length > 0 ? args : ['origin/main...HEAD'];
  const out = execFileSync('git', ['diff', '--name-only', ...range], { encoding: 'utf8' });
  const files = out.split('\n').filter(Boolean);
  const result = checkMissing({ files, body: process.env.PR_BODY });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  const problems = checkFormat(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'));
  if (problems.length > 0) {
    console.error(
      ['CHANGELOG.md の書き方が崩れています：', ...problems.map((p) => `  - ${p}`)].join('\n'),
    );
    process.exit(1);
  }
  console.log(
    result.facing.length === 0
      ? '利用する側に届くファイルは変わっていません。'
      : `利用する側に届くファイル ${result.facing.length} 件：CHANGELOG.md か PR の説明で確かめました。`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
