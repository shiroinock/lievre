import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Tabs, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen, Inbox, User, CircleCheck } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'タブ',
          selector: '.lv-tab',
          checks: ['inset-x', 'inset-y', 'control-height', 'fits'],
        },
        { name: 'タブの件数', selector: '.lv-tab-count', checks: ['inset-x', 'inset-y'] },
        { name: 'タブのアイコン', selector: '.lv-tab', checks: [{ icon: '.lv-tab-icon' }] },
        { name: 'タブの並び', selector: '.lv-tabs-list', checks: [{ sameHeight: '.lv-tab' }] },
      ],
    } satisfies LayoutGate,
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
/** アイコンを添えても、言葉は消しません。 */
export const WithIcons: Story = {
  args: {
    items: [
      {
        value: 'all',
        label: 'すべて',
        icon: <Inbox />,
        count: 128,
        content: <p>すべての作業です。</p>,
      },
      {
        value: 'mine',
        label: '自分の作業',
        icon: <User />,
        count: 12,
        content: <p>自分の作業です。</p>,
      },
      { value: 'done', label: '完了', icon: <CircleCheck />, content: <p>完了した作業です。</p> },
    ],
  },
};
