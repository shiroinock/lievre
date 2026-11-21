import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { TabNav } from '../index';
import { Bell, Settings2, Users } from 'lucide-react';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/TabNav',
  component: TabNav,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '移動のタブ',
          selector: '.lv-tab',
          checks: ['inset-y', 'control-height', { icon: '.lv-tab-icon' }],
        },
        { name: 'タブの件数', selector: '.lv-tab-count', checks: ['inset-x', 'inset-y'] },
        { name: 'タブの並び', selector: '.lv-tabs-list', checks: [{ sameHeight: '.lv-tab' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'タブの見た目のまま、ページを移るリンクを並べます。URL ごとに中身が変わる画面（設定の各ページなど）に使い、今のページは aria-current="page" と下線と太い文字で示します。同じ画面の中で中身を切り替えるなら Tabs を使います。矢印キーの操作はなく、リンクとして Tab で順に移ります。',
      },
    },
  },
  args: {
    label: '設定',
    items: [
      { href: '#general', label: '全般', icon: <Settings2 />, current: true },
      { href: '#members', label: '利用者', icon: <Users />, count: 12 },
      { href: '#notice', label: '通知', icon: <Bell /> },
    ],
  },
} satisfies Meta<typeof TabNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('navigation', { name: '設定' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: '全般' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};
export const WithoutIcons: Story = {
  args: {
    items: [
      { href: '#general', label: '全般' },
      { href: '#members', label: '利用者' },
      { href: '#notice', label: '通知', current: true },
    ],
  },
};
