// Known misses of kei/height-grid in src/styles/kei.css, measured before the rule existed.
// Fix the height, or move the reason into kei.css as
// `/* stylelint-disable-next-line kei/height-grid -- 理由 */`, then delete the entry here.
export const heightGridKnown = [
  {
    selector: '.k-status-dot',
    prop: 'height',
    reason: '状態の点。12px の文字に合わせた 6px の丸。',
  },
  {
    selector: '.k-switch-thumb',
    prop: 'height',
    reason: '高さ 24px から罫線 1px と padding 2px を上下で引いた 18px。',
  },
  { selector: '.k-progress', prop: 'height', reason: '進み具合の棒。罫線を含めて 6px。' },
  {
    selector: '.k-meter-hand',
    prop: 'height',
    reason: '針の長さ。目盛りの内側の半径（180px の 35%）に合わせた 63px。',
  },
  { selector: '.k-meter-hub', prop: 'height', reason: '針の軸。罫線 2px を含めて 10px の丸。' },
  {
    selector: ".k-table input[type='checkbox']",
    prop: 'height',
    reason: '表の中のブラウザ標準のチェックボックス。Checkbox 部品（20px）と揃っていない。',
  },
];
