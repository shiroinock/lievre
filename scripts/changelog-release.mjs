#!/usr/bin/env node
// Gathers the fragments in changes/ and what is left under 「## 未公開」 into a release of
// CHANGELOG.md, then deletes the fragments.
//
//   pnpm run changelog:release 0.3.0                    (dated today)
//   pnpm run changelog:release 0.3.0 --date 2026-12-01
//   pnpm run changelog:release 0.3.0 --dry-run          (prints the release, writes nothing)
//
// It only writes CHANGELOG.md and deletes the fragments; the versions in package.json, the tag and
// pnpm publish stay by hand.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  checkFormat,
  checkFragments,
  numberOf,
  parseEntries,
  readFragments,
  renderEntries,
  splitChangelog,
  UNRELEASED,
} from './check-changelog.mjs';

/** Today in the local time zone, as YYYY-MM-DD. */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * CHANGELOG.md with the release in place of 「## 未公開」. Items already under 「## 未公開」 come
 * first in their order; the fragments' items follow, by PR number, then by file.
 */
export function release({ changelog, fragments, version, date }) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
    throw new Error(`版「${version ?? ''}」は 0.3.0 の形で書く。`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      date
        ? `日付「${date}」は 2026-12-01 の形で書く。`
        : '--date の後に日付（2026-12-01 の形）を書く。',
    );
  }
  const heading = `## ${version}（${date}）`;
  if (changelog.split('\n').some((l) => l.startsWith(`## ${version}（`))) {
    throw new Error(`CHANGELOG.md に「## ${version}」がもうある。`);
  }
  const broken = checkFragments(fragments);
  if (broken.length > 0) {
    throw new Error(['断片の書き方が崩れている：', ...broken.map((p) => `  - ${p}`)].join('\n'));
  }

  const { before, body, after } = splitChangelog(changelog);
  const left =
    body === null || body.trim() === ''
      ? { entries: [], problems: [] }
      : parseEntries(body, { needNumber: false });
  if (left.problems.length > 0) {
    throw new Error(
      [`「## ${UNRELEASED}」の書き方が崩れている：`, ...left.problems.map((p) => `  - ${p}`)].join(
        '\n',
      ),
    );
  }
  const fromFragments = fragments
    .flatMap(({ file, text }) =>
      parseEntries(text).entries.map((e, i) => ({ ...e, file, index: i })),
    )
    .sort((a, b) => numberOf(a) - numberOf(b) || a.file.localeCompare(b.file) || a.index - b.index);
  const entries = [...left.entries, ...fromFragments];
  if (entries.length === 0) {
    throw new Error(`まとめるものがない。changes/ に断片がなく、「## ${UNRELEASED}」も空。`);
  }

  const parts = [before.replace(/\n+$/, ''), `${heading}\n\n${renderEntries(entries)}`];
  if (after.trim() !== '') parts.push(after.replace(/^\n+/, ''));
  const text = `${parts.join('\n\n').replace(/\n+$/, '')}\n`;
  const problems = checkFormat(text);
  if (problems.length > 0) {
    throw new Error(
      ['まとめた CHANGELOG.md が崩れている：', ...problems.map((p) => `  - ${p}`)].join('\n'),
    );
  }
  return { text, count: entries.length, heading };
}

function main(args) {
  let version;
  let date = today();
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--date') date = args[(i += 1)] ?? '';
    else if (args[i] === '--dry-run') dryRun = true;
    else version = args[i];
  }
  const root = new URL('..', import.meta.url);
  const file = new URL('CHANGELOG.md', root);
  const fragments = readFragments(root);
  let result;
  try {
    result = release({ changelog: readFileSync(file, 'utf8'), fragments, version, date });
  } catch (error) {
    console.error(error.message);
    console.error('\n使い方：pnpm run changelog:release 0.3.0 [--date 2026-12-01] [--dry-run]');
    process.exit(1);
  }
  if (dryRun) {
    process.stdout.write(result.text);
    return;
  }
  writeFileSync(file, result.text);
  for (const f of fragments) rmSync(new URL(f.file, root));
  console.log(
    `CHANGELOG.md に「${result.heading}」をまとめました（${result.count} 項目、断片 ${fragments.length} 件を消しました）。`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
