import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Select',
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          '単一選択。矢印キー・文字検索・Enter・Escapeに対応。ポータルにも現在のテーマを引き継ぎます。',
      },
    },
  },
  args: {
    label: '処理モード',
    options: [
      { value: 'standard', label: '標準モード' },
      { value: 'eco', label: '省電力モード' },
      { value: 'manual', label: '手動モード', disabled: true },
    ],
    disabled: false,
    required: false,
    onValueChange: fn(),
  },
  argTypes: { options: { control: 'object' } },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const Selected: Story = { args: { defaultValue: 'standard' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: '処理モードを選択してください。' } };
export const Selection: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox'));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('option', { name: '省電力モード' }),
    );
    await expect(canvas.getByRole('combobox')).toHaveTextContent('省電力モード');
    await expect(args.onValueChange).toHaveBeenCalledWith('eco');
  },
};
