import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Metric, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/Metric',
  component: Metric,
  parameters: {
    layoutGate: {
      parts: [
        { name: '指標', selector: '.k-metric', checks: ['padding-equal', 'fits'] },
        { name: '指標の変化', selector: '.k-metric-change', checks: [{ icon: 'svg' }] },
        { name: '指標の見出し', selector: '.k-metric-top', checks: [{ baseline: ':scope > *' }] },
        { name: '折れ線', selector: '.k-sparkline', checks: ['fills-x'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '数値・単位・比較・推移を1つの指標へ。増減が良いか悪いかはデータの意味で決めます。',
      },
    },
  },
  args: {
    label: '処理の成功率',
    value: '99.2',
    unit: '%',
    change: '通常稼働',
    values: [12, 16, 14, 22, 20, 26, 24, 32, 30, 38],
  },
} satisfies Meta<typeof Metric>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Up: Story = { args: { trend: 'up', change: '前週比 +0.8%' } };
export const Down: Story = {
  args: { label: '稼働率', value: '96.4', trend: 'down', change: '前週比 −2.8%' },
};
export const WithoutChart: Story = { args: { values: undefined } };
