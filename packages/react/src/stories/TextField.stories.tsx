import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { TextField, Button, Badge, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen, Search } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/TextField',
  component: TextField,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '入力欄',
          selector: '.lv-input:not(.lv-input--icon)',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        {
          // The left padding makes room for the icon on purpose; the right keeps the 0.3 ratio.
          name: 'アイコンのある入力欄',
          selector: '.lv-input--icon',
          checks: ['inset-y', 'control-height'],
        },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
        {
          name: '入力欄のアイコン',
          selector: '.lv-input-wrap',
          checks: [{ icon: '.lv-input-icon > svg', text: '.lv-input', block: true }],
        },
        {
          name: '前後の言葉',
          selector: '.lv-input-group',
          checks: [{ icon: '.lv-input-affix', text: '.lv-input', block: true }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ラベルは常時表示。hintとerrorは入力とaria-describedbyで関連付けます。placeholderだけをラベルにしません。単位は値に含めず suffix に、「https://」などは prefix に書きます（どちらも入力と aria-describedby で結びます）。icon は入力欄の中の先頭に置く飾りです。readOnly は枠を破線にし、値は読めてフォーカスも届きます。controlSize は sm 32px・md（密度）・lg 48px。',
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
export const Small: Story = { args: { controlSize: 'sm' } };
export const Large: Story = { args: { controlSize: 'lg' } };
/** 単位は値に含めず、入力欄の後ろに言葉で添えます。 */
export const WithSuffix: Story = {
  args: {
    label: '金額',
    suffix: '円',
    inputMode: 'numeric',
    defaultValue: '12000',
    hint: '税込みで入力してください。',
    className: 'lv-mono',
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('textbox', { name: '金額' }),
    ).toHaveAccessibleDescription('円 税込みで入力してください。');
  },
};
export const WithPrefix: Story = {
  args: { label: 'ウェブサイト', prefix: 'https://', placeholder: 'example.jp', hint: undefined },
};
/** 入力欄の中の先頭のアイコン。飾りなので読み上げません。 */
export const WithIcon: Story = {
  args: {
    label: '作業を探す',
    icon: <Search />,
    type: 'search',
    hint: undefined,
    placeholder: '作業名・番号',
  },
};
export const SmallWithIcon: Story = {
  args: { label: '絞り込み', icon: <Search />, controlSize: 'sm', hint: undefined },
};
export const LargeWithIconAndSuffix: Story = {
  args: { label: '数量', icon: <Plus />, suffix: '件', controlSize: 'lg', hint: undefined },
};
