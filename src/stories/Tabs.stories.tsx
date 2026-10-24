import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          '関連する内容の切り替え。左右矢印・Home・Endで移動でき、aria-selectedとtabpanelを関連付けます。',
      },
    },
  },
  args: {
    label: '詳細表示',
    items: [
      {
        value: 'overview',
        label: '概要',
        count: 8,
        content: <p>すべての作業を表示しています。</p>,
      },
      { value: 'history', label: '履歴', content: <p>変更履歴を表示しています。</p> },
    ],
  },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DisabledTab: Story = {
  args: {
    items: [
      { value: 'overview', label: '概要', content: <p>概要です。</p> },
      { value: 'history', label: '履歴', content: '履歴', disabled: true },
    ],
  },
};
export const Interaction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: '履歴' }));
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('変更履歴を表示しています。');
  },
};
