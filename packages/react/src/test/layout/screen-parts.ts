// Parts measured on composed screens (the demo and src/patterns). Some misplacements only show
// once parts sit together: a meter in a narrow cell, a chart stretched to a card, a label row.
import type { LayoutPart } from './declare';

export const SCREEN_PARTS: LayoutPart[] = [
  {
    name: 'ボタン',
    selector: '.lv-button',
    checks: ['inset-x', 'inset-y', 'control-height', 'fits'],
  },
  {
    name: 'バッジ',
    selector: '.lv-badge',
    checks: ['inset-y', 'grid-height', { icon: '.lv-status-dot' }],
  },
  {
    name: '入力欄',
    selector: '.lv-input:not(.lv-textarea)',
    checks: ['inset-y', 'control-height'],
  },
  { name: '選択の欄', selector: '.lv-select-trigger', checks: ['inset-y', 'control-height'] },
  { name: 'カードの本文', selector: '.lv-card-body', checks: ['padding-equal'] },
  {
    name: 'チェックボックスの欄',
    selector: '.lv-check-field',
    checks: [{ icon: '.lv-checkbox', text: '.lv-check-label' }],
  },
  { name: 'メーター', selector: '.lv-meter', checks: ['inset-x', 'fits'] },
  { name: '指標の見出し', selector: '.lv-metric-top', checks: [{ baseline: ':scope > *' }] },
  { name: '折れ線', selector: '.lv-sparkline', checks: ['fills-x'] },
  {
    name: '進み具合の見出し',
    selector: '.lv-progress-label',
    checks: [{ baseline: ':scope > *' }, 'line-grid'],
  },
  {
    name: '見せ方の切り替え',
    selector: '.lv-view-switch-item',
    checks: ['inset-x', 'inset-y', 'control-height'],
  },
  { name: '列の今の項目', selector: '.lv-queue-card', checks: ['padding-equal', 'fits'] },
  { name: '指標の値', selector: '.lv-metric-value', checks: ['line-grid'] },
  { name: 'メーターの読み値', selector: '.lv-meter-reading > strong', checks: ['line-grid'] },
];
