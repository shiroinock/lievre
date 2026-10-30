import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { TextField, Button, Badge, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/TextField',
  component: TextField,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '入力欄',
          selector: '.lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ラベルは常時表示。hintとerrorは入力とaria-describedbyで関連付けます。placeholderだけをラベルにしません。',
      },
    },
  },
  args: {
    label: 'ワークスペース名',
    placeholder: '例：計測ラボ',
    hint: '画面の左上に表示されます。',
    required: false,
    disabled: false,
    readOnly: false,
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: '計測ラボ' } };
export const Required: Story = { args: { required: true } };
export const Error: Story = {
  args: {
    label: 'メールアドレス',
    defaultValue: 'example@',
    error: '有効なメールアドレスを入力してください。',
  },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: '変更できません' } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: 'lievre-024' } };
export const Password: Story = {
  args: {
    label: 'パスワード',
    type: 'password',
    hint: '12文字以上を推奨します。',
    autoComplete: 'new-password',
  },
};
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '機材ラボ');
    await expect(input).toHaveValue('機材ラボ');
  },
};
