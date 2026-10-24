// Parts measured on composed screens (the demo and src/patterns). Some misplacements only show
// once parts sit together: a meter in a narrow cell, a chart stretched to a card, a label row.
import type { LayoutPart } from './declare';

export const SCREEN_PARTS: LayoutPart[] = [
  {
    name: 'ボタン',
    selector: '.k-button',
    checks: ['inset-x', 'inset-y', 'control-height', 'fits'],
  },
  {
    name: 'バッジ',
    selector: '.k-badge',
    checks: ['inset-y', 'grid-height', { icon: '.k-status-dot' }],
  },
  { name: '入力欄', selector: '.k-input:not(.k-textarea)', checks: ['inset-y', 'control-height'] },
  { name: '選択の欄', selector: '.k-select-trigger', checks: ['inset-y', 'control-height'] },
  { name: 'カードの本文', selector: '.k-card-body', checks: ['padding-equal'] },
  {
    name: 'チェックボックスの欄',
    selector: '.k-check-field',
    checks: [{ icon: '.k-checkbox', text: '.k-check-label' }],
  },
  { name: 'メーター', selector: '.k-meter', checks: ['inset-x', 'fits'] },
  { name: '指標の見出し', selector: '.k-metric-top', checks: [{ baseline: ':scope > *' }] },
  { name: '折れ線', selector: '.k-sparkline', checks: ['fills-x'] },
  {
    name: '進み具合の見出し',
    selector: '.k-progress-label',
    checks: [{ baseline: ':scope > *' }, 'line-grid'],
  },
  { name: '指標の値', selector: '.k-metric-value', checks: ['line-grid'] },
  { name: 'メーターの読み値', selector: '.k-meter-reading > strong', checks: ['line-grid'] },
];
