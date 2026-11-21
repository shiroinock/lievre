import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Avatar, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Display/Avatar',
  component: Avatar,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'アバター',
          selector: '.lv-avatar:not(:has(img))',
          checks: ['inset-x', 'inset-y', 'grid-height'],
        },
        { name: '画像のアバター', selector: '.lv-avatar:has(img)', checks: ['grid-height'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: { component: '名前の最初の2文字を表示。フルネームはaria-labelに保持します。' },
    },
  },
  args: { name: '佐藤' },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const LatinName: Story = { args: { name: 'SK' } };
const photo =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    // Shapes in the default fill at low opacity: a placeholder picture without colour literals.
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill-opacity="0.35"><circle cx="24" cy="19" r="9"/><rect x="10" y="32" width="28" height="16" rx="8"/></svg>',
  );
/** 画像。読み込めないときは頭文字に戻します。名前は name で読み上げます。 */
export const Image: Story = { args: { src: photo, size: 'lg' } };
export const BrokenImage: Story = {
  args: { src: 'data:image/png;base64,broken', size: 'lg' },
  play: async ({ canvasElement }) => {
    const avatar = within(canvasElement).getByRole('img', { name: '佐藤' });
    await expect(avatar).toBeVisible();
  },
};
/** 4つの大きさ。 */
export const Sizes: Story = {
  render: () => (
    <div className="button-row">
      <Avatar name="計測 太郎" size="sm" />
      <Avatar name="計測 太郎" size="md" />
      <Avatar name="計測 太郎" size="lg" />
      <Avatar name="計測 太郎" size="xl" />
    </div>
  ),
};
/** 組織や取引先は四角にし、人と形で見分けます。 */
export const Square: Story = { args: { name: '東京拠点', shape: 'square', size: 'lg' } };
