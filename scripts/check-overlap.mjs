#!/usr/bin/env node
// Tells which open PRs touch the same files as this one, by what they declare under
// 「## 触るファイル」 in the description and by what they actually change. It only tells; it never
// fails.
//
//   npm run check:overlap              (this branch's PR, or this branch's diff when it has none)
//   npm run check:overlap -- 12        (PR #12)
//   npm run check:overlap -- --all     (every pair of open PRs)
//
// Needs gh. Generated files and CHANGELOG.md are listed apart: write them out again and they mend.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const HEADING = '触るファイル';

/** Mended by `npm run llms`, `npm run tokens`, or by keeping both lines. */
export const REWRITABLE = [
  'packages/react/llms.txt',
  'packages/tokens/tokens.json',
  'CHANGELOG.md',
];

/**
 * The paths listed under 「## 触るファイル」, one list item each, in backticks or bare. HTML comments
 * (the template's hints) and fenced code are not declarations.
 */
export function parseDeclared(body = '') {
  const text = (body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, '');
  const lines = text.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^#{1,6}\\s+${HEADING}\\s*$`).test(l));
  if (start === -1) return null;
  const level = /^#+/.exec(lines[start])[0].length;
  const paths = [];
  for (const line of lines.slice(start + 1)) {
    const h = /^(#{1,6})\s/.exec(line);
    if (h && h[1].length <= level) break;
    const item = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(line);
    if (!item) continue;
    const quoted = /`([^`]+)`/.exec(item[1]);
    const path = (quoted ? quoted[1] : (/^[^\s（(：:、,]*/.exec(item[1])?.[0] ?? ''))
      .trim()
      .replace(/^\.\//, '');
    if (path) paths.push(path);
  }
  return paths;
}

/** `dir/` is everything under it; `*` is any name and `**` any path. */
function toMatcher(entry) {
  const pattern = entry.endsWith('/') ? `${entry}**` : entry;
  const literal = pattern.split('*')[0];
  if (literal === pattern) return { entry, literal, test: (f) => f === pattern, exact: true };
  const re = new RegExp(
    `^${pattern
      .split(/(\*\*|\*)/)
      .map((part) =>
        part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
      )
      .join('')}$`,
  );
  return { entry, literal, test: (f) => re.test(f), exact: false };
}

/** The entries of `a` that may touch the same file as an entry of `b`, with what they meet. */
export function overlap(a, b) {
  const mb = b.map(toMatcher);
  const hits = [];
  for (const ma of a.map(toMatcher)) {
    for (const m of mb) {
      const meets =
        ma.exact && m.exact
          ? ma.entry === m.entry
          : ma.exact
            ? m.test(ma.entry)
            : m.exact
              ? ma.test(m.entry)
              : ma.literal.startsWith(m.literal) || m.literal.startsWith(ma.literal);
      if (meets) hits.push(ma.exact || !m.exact ? ma.entry : m.entry);
    }
  }
  return [...new Set(hits)];
}

/** What a PR may touch: what it declares and what it changes, each path tagged with where from. */
export function touched(pr) {
  const declared = parseDeclared(pr.body) ?? [];
  const changed = (pr.files ?? []).map((f) => f.path ?? f);
  return { declared, changed, all: [...new Set([...declared, ...changed])] };
}

/** A PR stacked on the other one builds on it, so their shared files are expected. */
export function stacked(a, b) {
  return a.baseRefName === b.headRefName || b.baseRefName === a.headRefName;
}

/** The overlaps of `target` with each of `others`, split into ones to mind and ones that mend. */
export function findOverlaps(target, others) {
  const mine = touched(target).all;
  const found = [];
  for (const other of others) {
    if (other.number === target.number || stacked(target, other)) continue;
    const theirs = touched(other);
    const files = overlap(mine, theirs.all);
    if (files.length === 0) continue;
    const mend = files.filter((f) => REWRITABLE.includes(f));
    const mind = files.filter((f) => !REWRITABLE.includes(f));
    found.push({
      other,
      mind,
      mend,
      declaredOnly: mind.filter((f) => !overlap([f], theirs.changed).length),
    });
  }
  return found;
}

const label = (pr) => (pr.number ? `#${pr.number} ${pr.title}` : pr.title);

/** The report for one PR: what overlaps, and what to do about it. */
export function report(target, found) {
  const lines = [];
  if (target.number && parseDeclared(target.body) === null) {
    lines.push(
      `${label(target)} の本文に「## ${HEADING}」がありません。`,
      '  直し方：.github/pull_request_template.md の節を写し、変えるつもりのファイルを1行に1つ書く。',
      '',
    );
  }
  const minding = found.filter((f) => f.mind.length > 0);
  if (minding.length === 0) {
    lines.push(`${label(target)}：ほかの開いた PR と重なるファイルはありません。`);
  } else {
    lines.push(`${label(target)} と重なる PR があります：`);
    for (const { other, mind, declaredOnly } of minding) {
      lines.push(`  ${label(other)}（${other.headRefName}${other.isDraft ? '、下書き' : ''}）`);
      for (const f of mind) {
        lines.push(`    - ${f}${declaredOnly.includes(f) ? '（向こうはまだ宣言だけ）' : ''}`);
      }
    }
    lines.push(
      '',
      '直し方（どれか）：',
      '  1. 向こうと分け方を相談し、片方の「触るファイル」から外す（本文を直す）。',
      '  2. 向こうがあとから始めたなら、向こうの枝に積む（PR の向き先をその枝にする）。',
      '  3. 重なったまま進めるなら、先にマージされた方を main から取り込んで食い違いを直す。',
    );
  }
  const mending = [...new Set(found.flatMap((f) => f.mend))];
  if (mending.length > 0) {
    lines.push(
      '',
      `重なっても書き出し直せば済むもの：${mending.join('、')}`,
      '  食い違ったら、llms.txt は npm run llms、tokens.json は npm run tokens、CHANGELOG.md は両方の行を残す。',
    );
  }
  return lines.join('\n');
}

const FIELDS = 'number,title,headRefName,baseRefName,isDraft,body,files';

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The PR to look at, from the arguments or the current branch. */
export function pickTarget(args, prs, { git = (a) => sh('git', a) } = {}) {
  const n = args.find((a) => /^#?\d+$/.test(a));
  if (n) {
    const pr = prs.find((p) => p.number === Number(n.replace('#', '')));
    if (!pr) throw new Error(`#${n.replace('#', '')} は開いた PR にありません。`);
    return pr;
  }
  const branch = git(['branch', '--show-current']).trim();
  const own = prs.find((p) => p.headRefName === branch);
  // Uncommitted and unpushed changes count too: they are what this branch is about to touch.
  const local = [
    ...git(['diff', '--name-only', 'origin/main...HEAD']).split('\n'),
    ...git(['diff', '--name-only', 'HEAD']).split('\n'),
  ].filter(Boolean);
  if (own) {
    const files = [...new Set([...(own.files ?? []).map((f) => f.path ?? f), ...local])];
    return { ...own, files };
  }
  return {
    number: 0,
    title: `この枝（${branch}、PR なし）`,
    headRefName: branch,
    baseRefName: 'main',
    body: '',
    files: local,
  };
}

export function main(args, { gh = (a) => sh('gh', a), git, log = console.log } = {}) {
  const prs = JSON.parse(gh(['pr', 'list', '--state', 'open', '--limit', '200', '--json', FIELDS]));
  if (args.includes('--all')) {
    const out = [];
    prs.forEach((pr, i) => {
      const found = findOverlaps(pr, prs.slice(i + 1)).filter((f) => f.mind.length > 0);
      if (found.length > 0) out.push(report(pr, found));
    });
    log(out.length > 0 ? out.join('\n\n') : '開いた PR どうしで重なるファイルはありません。');
    return;
  }
  const target = pickTarget(args, prs, git ? { git } : undefined);
  log(report(target, findOverlaps(target, prs)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    // Telling only: a missing gh or network never fails the caller.
    console.error(`重なりを調べられませんでした：${error.message}`);
    console.error(
      '  直し方：gh をログインした状態で入れ（gh auth login）、リポジトリの直下で流す。',
    );
  }
}
