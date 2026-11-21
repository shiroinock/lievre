import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  LABEL,
  MARKER,
  decide,
  ensureBaseCi,
  run,
  touchesWorkflows,
} from './merge-reservation.mjs';

const pr = (over = {}) => ({
  number: 12,
  title: '部品',
  state: 'OPEN',
  baseRefName: 'main',
  isDraft: false,
  isCrossRepository: false,
  autoMergeRequest: null,
  labels: [{ name: LABEL }],
  files: [{ path: 'packages/react/src/components/form.tsx' }],
  ...over,
});

test('しるしがあり main に向いた PR に、自動マージを入れる', () => {
  assert.equal(decide(pr()).action, 'enable');
});

test('向き先が main でないあいだは、待つ（その場でマージされるのを防ぐ）', () => {
  const result = decide(pr({ baseRefName: 'claude/component-table' }));
  assert.equal(result.action, 'wait');
  assert.match(result.reason, /claude\/component-table/);
  assert.match(result.reason, /付け替わったら/);
});

test('しるしがない・閉じた・予約済みの PR は、何もしない', () => {
  assert.equal(decide(pr({ labels: [{ name: 'bug' }] })).action, 'skip');
  assert.equal(decide(pr({ state: 'MERGED' })).action, 'skip');
  assert.equal(decide(pr({ autoMergeRequest: { mergeMethod: 'MERGE' } })).action, 'skip');
});

test('下書きは、Ready for review になるまで待つ', () => {
  const result = decide(pr({ isDraft: true }));
  assert.equal(result.action, 'wait');
  assert.match(result.reason, /Ready for review/);
});

test('フォークの PR と workflow を変える PR は、手でマージするよう知らせる', () => {
  assert.equal(decide(pr({ isCrossRepository: true })).action, 'manual');
  const result = decide(pr({ files: [{ path: '.github/workflows/ci.yml' }] }));
  assert.equal(result.action, 'manual');
  assert.match(result.reason, /gh pr merge --merge/);
  assert.equal(touchesWorkflows(['.github/pull_request_template.md']), false);
});

/** A fake gh: answers from `prs` and records every call. */
function fakeGh(prs, { comments = [], runs = [] } = {}) {
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    const [cmd, sub, n] = args;
    if (cmd === 'pr' && sub === 'list') return JSON.stringify(prs);
    if (cmd === 'pr' && sub === 'view' && args.at(-1) === 'comments') {
      return JSON.stringify({ comments });
    }
    if (cmd === 'pr' && sub === 'view') return JSON.stringify(prs.find((p) => `${p.number}` === n));
    if (cmd === 'api') return 'abc1234def\n';
    if (cmd === 'run') return JSON.stringify(runs);
    return '';
  };
  return { gh, calls };
}

const quiet = () => {};

test('予約するのは main に向いた PR だけで、merge commit で入れる', () => {
  const { gh, calls } = fakeGh([pr({ number: 1 }), pr({ number: 2, baseRefName: 'claude/a' })]);
  const results = run({ gh, log: quiet });
  assert.deepEqual(
    results.map((r) => r.action),
    ['enable', 'wait'],
  );
  const merges = calls.filter((c) => c[0] === 'pr' && c[1] === 'merge');
  assert.deepEqual(merges, [['pr', 'merge', '1', '--auto', '--merge']]);
});

test('ラベルの付いていない PR は、読み直さない', () => {
  const { gh, calls } = fakeGh([pr({ number: 5, labels: [] })]);
  assert.deepEqual(run({ gh, log: quiet }), []);
  assert.equal(
    calls.some((c) => c[1] === 'view'),
    false,
  );
  const list = calls.find((c) => c[1] === 'list');
  assert.equal(
    list.includes('--label'),
    false,
    '--label は search を通り、付けた直後のラベルを見落とす',
  );
});

test('一覧のあとに向き先が変わっていたら、読み直した向き先で決める', () => {
  const listed = [pr({ number: 3 })];
  const { gh, calls } = fakeGh(listed);
  const viewOnly = (args) =>
    args[0] === 'pr' && args[1] === 'view'
      ? JSON.stringify(pr({ number: 3, baseRefName: 'claude/b' }))
      : gh(args);
  run({ gh: viewOnly, log: quiet });
  assert.equal(
    calls.some((c) => c[1] === 'merge'),
    false,
  );
});

test('手でマージする PR へのコメントは、1度だけ', () => {
  const manual = [pr({ number: 4, files: [{ path: '.github/workflows/ci.yml' }] })];
  const first = fakeGh(manual);
  run({ gh: first.gh, log: quiet });
  const comment = first.calls.find((c) => c[1] === 'comment');
  assert.ok(comment);
  assert.match(comment.at(-1), new RegExp(MARKER));

  const again = fakeGh(manual, { comments: [{ body: `${MARKER}\n前のコメント` }] });
  run({ gh: again.gh, log: quiet });
  assert.equal(
    again.calls.some((c) => c[1] === 'comment'),
    false,
  );
});

test('main の先頭に CI が走っていなければ、workflow_dispatch で走らせる', () => {
  const none = fakeGh([]);
  assert.equal(ensureBaseCi({ gh: none.gh, log: quiet }), true);
  assert.ok(none.calls.some((c) => c.join(' ') === 'workflow run ci.yml --ref main'));

  const ran = fakeGh([], { runs: [{ status: 'completed' }] });
  assert.equal(ensureBaseCi({ gh: ran.gh, log: quiet }), false);
});

const workflow = readFileSync(
  new URL('../.github/workflows/merge-reservation.yml', import.meta.url),
  'utf8',
);

test('workflow は PR のコードを取り出さず、run に式を埋め込まない', () => {
  assert.doesNotMatch(workflow, /pull_request\.head/, 'PR の head を checkout しない');
  assert.match(workflow, /^permissions: \{\}$/m, '既定の権限は空にして、job ごとに足す');
  const runs = [...workflow.matchAll(/^\s+run: (.*)$/gm)].map((m) => m[1]);
  for (const line of runs) {
    assert.doesNotMatch(line, /\$\{\{/, `run に式を埋め込まず env を通す：${line}`);
  }
  assert.match(workflow, new RegExp(`'${LABEL}'`), 'if のラベル名はスクリプトと揃える');
});

test('CI は workflow_dispatch でも走る（GITHUB_TOKEN のマージのあと）', () => {
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(ci, /^ {2}workflow_dispatch:/m);
});
