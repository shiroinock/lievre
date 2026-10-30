import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Textarea, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Textarea',
  component: Textarea,
  parameters: {
    layoutGate: {
      parts: [{ name: '複数行の入力欄', selector: '.k-textarea', checks: ['grid-height'] }],
    } satisfies LayoutGate,
    docs: { description: { component: '複数行の入力。幅は親に従い、縦方向にリサイズできます。' } },
  },
  args: {
    label: '作業メモ',
    placeholder: '手順や補足を入力',
    hint: '500文字以内',
    maxLength: 500,
    disabled: false,
    required: false,
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = {
  args: { defaultValue: '接続状態を確認してから、同期を実行してください。' },
};
export const Error: Story = {
  args: { error: '500文字以内で入力してください。', defaultValue: '作業メモ' },
};
export const Disabled: Story = { args: { disabled: true } };
