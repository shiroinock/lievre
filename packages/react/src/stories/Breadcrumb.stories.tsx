import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Breadcrumb,
  Button,
  Badge,
  TextField,
  DialogClose,
  ToastProvider,
  useToast,
} from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'パンくず',
          selector: '.lv-breadcrumb',
          checks: ['fits', { sameHeight: ':scope > li' }],
        },
        {
          name: '省いた階層を出すボタン',
          selector: '.lv-breadcrumb-more',
          checks: ['inset-x', 'grid-height'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '現在地はaria-current=page。最後の項目をリンクにせず現在地を示します。maxItems を超えると、最初と最後の階層を残して間を「…」のボタンにまとめます。押すと省いた階層をその場に出し、フォーカスを省いていた最初の階層へ移します。',
      },
    },
  },
  args: {
    items: [
      { label: 'ホーム', href: '#' },
      { label: 'ワークスペース', href: '#' },
      { label: '作業モニター' },
    ],
  },
} satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SingleLevel: Story = { args: { items: [{ label: 'ワークスペース' }] } };
const deep = [
  { label: 'ホーム', href: '#' },
  { label: '組織', href: '#' },
  { label: '東日本', href: '#' },
  { label: '東京拠点', href: '#' },
  { label: '計測ラボ', href: '#' },
  { label: '作業 W-1024' },
];
/** 長いときは間を省きます。 */
export const Collapsed: Story = { args: { items: deep, maxItems: 3 } };
/** 「…」を押すと、省いた階層をその場に出し、フォーカスを移します。 */
export const ExpandCollapsed: Story = {
  args: { items: deep, maxItems: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('link', { name: '組織' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: '省いた3つの階層を出す' }));
    await expect(canvas.getByRole('link', { name: '組織' })).toHaveFocus();
  },
};
