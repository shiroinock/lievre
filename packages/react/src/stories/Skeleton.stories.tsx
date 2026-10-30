import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Skeleton, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layoutGate: {
      parts: [{ name: '仮表示', selector: '.lv-skeleton', checks: ['grid-height'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component: '読込後のレイアウトを保つ仮表示。動きを減らす設定ではアニメーションを止めます。',
      },
    },
  },
  args: { width: 240, height: 20, label: '読み込み中' },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Panel: Story = {
  render: () => (
    <div className="gallery-stack" style={{ width: 320 }}>
      <Skeleton width="40%" />
      <Skeleton height={24} />
      <Skeleton height={24} />
      <Skeleton width="70%" />
    </div>
  ),
};
