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
      parts: [
        { name: '複数行の入力欄', selector: '.lv-textarea', checks: ['grid-height'] },
        { name: '文字数', selector: '.lv-field-count', checks: ['line-grid'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '複数行の入力。幅は親に従い、縦方向にリサイズできます。maxCount で文字数と上限を出します（上限を超えても入力は止めず、超えた数を言葉と記号で示します）。autoResize で書いた分だけ高さを伸ばします。',
      },
    },
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
/** 文字数と上限。上限を超えても入力は止めません。 */
export const WithCount: Story = {
  args: {
    maxCount: 100,
    maxLength: undefined,
    hint: undefined,
    defaultValue: '接続状態を確認してから、同期を実行してください。',
  },
};
export const OverCount: Story = {
  args: {
    maxCount: 20,
    maxLength: undefined,
    hint: undefined,
    defaultValue: '接続状態を確認してから、同期を実行してください。',
    error: '20文字以内にしてください。',
  },
};
/** 全角を2、半角を1と数える形。 */
export const CountByWidth: Story = {
  args: {
    maxCount: 40,
    countBy: 'width',
    maxLength: undefined,
    hint: undefined,
    defaultValue: 'W-1024 の確認',
  },
};
/** 書いた分だけ高さを伸ばします（4行分から12行分まで）。 */
export const AutoResize: Story = {
  args: {
    autoResize: true,
    defaultValue:
      '1. 接続状態を確認する\n2. 同期を実行する\n3. 結果を記録する\n4. 担当者に知らせる\n5. 作業を閉じる\n6. 翌日の予定を立てる',
  },
};
export const CountTyping: Story = {
  args: { maxCount: 10, maxLength: undefined, hint: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), '確認します');
    await expect(canvasElement.querySelector('.lv-field-count')).toHaveTextContent('5 / 10');
  },
};
