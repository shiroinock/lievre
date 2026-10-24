// results.json を、確かめる点ごとの ○／× の表（test/summary.md）にする。
// セルは「Chromium と WebKit が同じならその記号、違えば Chromium / WebKit」。
import { readFileSync, writeFileSync } from 'node:fs';

const results = JSON.parse(readFileSync(new URL('./results.json', import.meta.url)));
const get = (browser, variant, ctx, scenario) =>
  results.find(
    (r) =>
      r.browser === browser && r.variant === variant && r.ctx === ctx && r.scenario === scenario,
  );
const variants = [...new Set(results.map((r) => r.variant))];
const last = '新潟米穀';
const expectedCounts = {
  かぶしき: 3,
  ｶﾌﾞｼｷ: 3,
  カブシキ: 3,
  abc: 1,
  ＡＢＣ: 1,
  やまだ: 1,
  xyz: 1,
  ｘｙｚ: 1,
};
const open = (s) => s?.expanded === 'true' && s?.visible;
const closed = (s) => s && s.expanded !== 'true' && !s.visible;

// 各点の判定。返す値は記号と短い注記。null は「当てはまらない」。
const checks = [
  ['矢印で開く', 'arrows', (r) => (open(r.down1) ? (r.down1.active ? '○' : '○ 開くだけ') : '×')],
  ['矢印で候補を移る', 'arrows', (r) => (r.down2?.active ? '○' : '×')],
  [
    'Home / End',
    'arrows',
    (r) =>
      !open(r.end)
        ? '× 閉じる'
        : r.end.active === last
          ? r.end.scrollY > 0
            ? '△ 移るが画面も動く'
            : '○ 先頭・末尾へ'
          : '— 入力欄の行頭・行末',
  ],
  [
    'Enter で確定して閉じる',
    'enter',
    (r) => (r.afterEnter?.value && closed(r.afterEnter) ? '○' : '×'),
  ],
  ['選んだ候補に aria-selected', 'enter', (r) => (r.selectedAttr?.length === 1 ? '○' : '×')],
  [
    'Esc（1回目）',
    'escape',
    (r, ctx) => {
      if (ctx === 'dialog') {
        if (r.esc1?.dialog !== 'dialog-open') return '× ダイアログごと閉じる';
        return closed(r.esc1) ? '○ 一覧だけ閉じる' : '×';
      }
      if (!closed(r.esc1)) return '×';
      return r.esc1.input === r.opened.input ? '○ 閉じる（文字は残す）' : '○ 閉じる（文字を戻す）';
    },
  ],
  [
    'Esc（2回目）',
    'escape',
    (r, ctx) =>
      ctx === 'dialog'
        ? r.esc1?.dialog === 'dialog-closed'
          ? '— 1回目で閉じている'
          : r.esc2?.dialog === 'dialog-closed' && r.esc2.focus === 'dialog-trigger'
            ? '○ ダイアログが閉じ、開いたボタンへ戻る'
            : '×'
        : r.esc2?.input === '' && r.esc1?.input !== ''
          ? '○ 文字を消す'
          : '— 何もしない',
  ],
  [
    'Tab',
    'tab',
    (r) => {
      if (r.after?.focus === 'combobox' || r.after?.focus === 'option')
        return open(r.after) ? '— 一覧に留まる' : '×';
      if (open(r.after)) return '× 一覧が開いたまま';
      return r.after?.value ? '○ 選びかけを確定して次へ' : '○ 確定せず次へ';
    },
  ],
  [
    '外側を押す',
    'outside',
    (r, ctx) => {
      if (r.clickError) return 'エラー';
      if (!closed(r.after)) return '× 閉じない';
      if (ctx === 'dialog')
        return r.after.dialog === 'dialog-open' ? '○ 一覧だけ閉じる' : '× ダイアログも閉じる';
      return r.after.clicks === '1'
        ? '○ 閉じて、押した物にも届く'
        : '○ 閉じる（押した物には届かない）';
    },
  ],
  [
    'ポインターで候補を選ぶ',
    'pickWithPointer',
    (r) =>
      r.after?.value === 'tokyo' ? '○' : r.hit?.role !== 'option' ? '× 幕の下で押せない' : '×',
  ],
  [
    '重なりの順序（z-index）',
    'pickWithPointer',
    (r) => (r.hit?.role === 'option' ? '○ 一番上' : '× 下に隠れる'),
  ],
  ['ポータルが PortalSurface の中', 'theme', (r) => (r.surfaceTheme === 'ink' ? '○' : '×')],
  [
    'IME：変換中は絞り込まない',
    'imeChrome',
    (r) => (r.skipped ? null : r.composing?.count === r.start?.count ? '○' : '×'),
  ],
  [
    'IME：変換中の矢印で候補が動かない',
    'imeChrome',
    (r) => (r.skipped ? null : r.arrowWhileComposing?.active === r.composing?.active ? '○' : '×'),
  ],
  ['IME：確定の Enter で選ばない（Chrome の順）', 'imeChrome', (r) => imeCommit(r)],
  ['IME：確定の Enter で選ばない（Safari の順）', 'imeSafari', (r) => imeCommit(r)],
  [
    'IME：変換中の Esc で閉じない',
    'imeEscape',
    (r, ctx) =>
      r.skipped
        ? null
        : r.after?.dialog === (ctx === 'dialog' ? 'dialog-open' : 'dialog-closed') && open(r.after)
          ? '○'
          : r.after?.dialog === 'dialog-closed' && ctx === 'dialog'
            ? '× ダイアログが閉じる'
            : '× 一覧が閉じる',
  ],
  [
    'かな・全角半角を無視して一致',
    'normalize',
    (r) =>
      r.skipped ? null : Object.entries(expectedCounts).every(([q, n]) => r[q] === n) ? '○' : '×',
  ],
  ['axe の指摘', 'a11y', (r) => (r.axe?.length ? `× ${r.axe.join(', ')}` : '○ なし')],
  [
    '候補の数の読み上げ（live region）',
    'a11y',
    (r) => (r.attrs?.live?.length ? `○ 「${r.attrs.live[0]}」` : '× なし'),
  ],
];
function imeCommit(r) {
  if (r.skipped) return null;
  const c = r.committed;
  if (!c) return '×';
  if (c.value) return '× 選んでしまう';
  if (c.input !== '東京') return '× 入力が消える';
  return open(c) ? '○' : '△ 一覧が閉じる';
}

const cell = (variant, ctx, scenario, fn, suffix = '') => {
  const out = ['chromium', 'webkit'].map((b) => {
    const r = get(b, variant, ctx, scenario + suffix);
    if (!r) return null;
    if (r.error) return `エラー`;
    return fn(r, ctx);
  });
  if (out.every((o) => o === null)) return '';
  return out[0] === out[1] ? out[0] : `${out[0]} / ${out[1]}`;
};

let md =
  '# 試作の検査の結果\n\n`npm run check` が出した `results.json` を `node test/summary.mjs` でまとめたもの。セルは「Chromium と WebKit が同じならその記号、違えば Chromium / WebKit」。IME は合成のイベントで再現している（README を参照）。\n';
for (const [ctx, title] of [
  ['plain', '画面の上で使う'],
  ['dialog', 'Dialog の中で使う'],
]) {
  md += `\n## ${title}\n\n| 確かめる点 | ${variants.join(' | ')} |\n| --- |${variants.map(() => ' --- |').join('')}\n`;
  for (const [label, scenario, fn] of checks)
    md += `| ${label} | ${variants.map((v) => cell(v, ctx, scenario, fn)).join(' | ')} |\n`;
}
md += '\n## IME の守りを外したとき（土台そのものの扱い）\n\n';
md += `| 確かめる点 | 場面 | ${variants.filter((v) => v !== 'select').join(' | ')} |\n| --- | --- |${variants
  .filter((v) => v !== 'select')
  .map(() => ' --- |')
  .join('')}\n`;
for (const ctx of ['plain', 'dialog'])
  for (const [label, scenario, fn] of checks.filter(([, s]) => s.startsWith('ime')))
    md += `| ${label} | ${ctx === 'plain' ? '画面' : 'Dialog'} | ${variants
      .filter((v) => v !== 'select')
      .map((v) => cell(v, ctx, scenario, fn, ':noguard'))
      .join(' | ')} |\n`;
writeFileSync(new URL('./summary.md', import.meta.url), md);
console.log(md);
