import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Badge, Button, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Badge',
  component: Badge,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'バッジ',
          selector: '.lv-badge',
          checks: ['inset-x', 'inset-y', 'grid-height', 'fits', { icon: '.lv-status-dot' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '色に加えて状態の文字を必ず併用します。dotは稼働・接続などの状態を補助する記号です。emphasis="strong" は状態の色で塗る強い形で、一覧の中で特に目立たせたい1つだけに使います。size="sm" は表のセルやタブの中に置く小さな形です。',
      },
    },
  },
  args: { children: '待機中', tone: 'neutral' },
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'success', 'warning', 'danger', 'info'] },
    emphasis: { control: 'inline-radio', options: ['soft', 'strong'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Success: Story = { args: { tone: 'success', dot: true, children: '稼働中' } };
export const Warning: Story = { args: { tone: 'warning', dot: true, children: '要確認' } };
export const Danger: Story = { args: { tone: 'danger', dot: true, children: '停止' } };
export const Info: Story = { args: { tone: 'info', children: '情報' } };
export const AllStates: Story = {
  render: () => (
    <div className="button-row">
      <Badge>待機中</Badge>
      <Badge tone="success" dot>
        稼働中
      </Badge>
      <Badge tone="warning" dot>
        要確認
      </Badge>
      <Badge tone="danger" dot>
        停止
      </Badge>
      <Badge tone="info">情報</Badge>
    </div>
  ),
};
export const Strong: Story = {
  args: { tone: 'danger', emphasis: 'strong', dot: true, children: '停止' },
};
export const Small: Story = { args: { tone: 'info', size: 'sm', children: '新着' } };
/** 強さと大きさの組み合わせ。 */
export const AllEmphasis: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['soft', 'strong'] as const).map((emphasis) =>
        (['md', 'sm'] as const).map((size) => (
          <div className="button-row" key={emphasis + size}>
            <Badge emphasis={emphasis} size={size}>
              待機中
            </Badge>
            <Badge tone="success" emphasis={emphasis} size={size} dot>
              稼働中
            </Badge>
            <Badge tone="warning" emphasis={emphasis} size={size} dot>
              要確認
            </Badge>
            <Badge tone="danger" emphasis={emphasis} size={size} dot>
              停止
            </Badge>
            <Badge tone="info" emphasis={emphasis} size={size}>
              情報
            </Badge>
          </div>
        )),
      )}
    </div>
  ),
};
