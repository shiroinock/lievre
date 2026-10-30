import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ボタン',
          selector: '.k-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '主要操作はprimaryを1つ。通常はsecondary、補助操作はghost。loading中は再クリックを防ぎ、ボタンのラベルは残します。',
      },
    },
  },
  args: { children: '保存する', size: 'md', loading: false, disabled: false, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost', children: '取り消す' } };
export const Danger: Story = { args: { variant: 'danger', children: '削除する' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const WithIcon: Story = { args: { icon: <Plus size={15} />, children: '作業を追加' } };
export const IconOnly: Story = {
  args: { children: <Settings2 size={16} />, 'aria-label': '設定を開く' },
};
export const Loading: Story = { args: { loading: true, children: '保存中' } };
export const Disabled: Story = { args: { disabled: true } };
export const ClickInteraction: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
