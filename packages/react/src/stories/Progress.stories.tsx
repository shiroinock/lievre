import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Progress, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/Progress',
  component: Progress,
  parameters: {
    layoutGate: {
      parts: [
        { name: '進み具合', selector: '.lv-progress-wrap', checks: ['fits'] },
        {
          name: '進み具合の状態のアイコン',
          selector: '.lv-progress-status',
          checks: [{ icon: ':scope > svg' }],
        },
        {
          name: '進み具合の見出し',
          selector: '.lv-progress-label',
          checks: [{ baseline: ':scope > *' }, 'line-grid'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '値は0〜100に丸めます。名称と数値を補助技術に伝え、数値の常時表示を推奨します。値の分からない処理は value を省くと「処理中」の形になり、動きを減らす設定では縞で止まります。tone の success・danger は、棒の色に加えてアイコンと「完了」「失敗」の言葉を出します。',
      },
    },
  },
  args: { label: 'データ同期', value: 68, showValue: true },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 100 } };
export const Clamped: Story = { args: { value: 130 } };
export const HiddenValue: Story = { args: { showValue: false } };
/** 値の分からない処理中。数値の代わりに「処理中」と出します。 */
export const Indeterminate: Story = { args: { value: undefined, label: '書き出しの準備' } };
export const Success: Story = { args: { value: 100, tone: 'success', label: 'データ同期' } };
export const Danger: Story = {
  args: { value: 72, tone: 'danger', statusLabel: '3件が失敗', label: 'データ同期' },
};
