import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Select, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Select',
  component: Select,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '選択の欄',
          selector: '.lv-select-trigger',
          checks: ['inset-y', 'control-height', { padding: 'input' }, 'fits', { icon: 'svg' }],
        },
        { name: '選択肢の一覧', selector: '.lv-select-content', checks: ['padding-equal'] },
        { name: '選択肢', selector: '.lv-select-item', checks: ['inset-y', 'control-height'] },
        { name: '選択肢のまとまりの見出し', selector: '.lv-select-label', checks: ['line-grid'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '単一選択。矢印キー・文字検索・Enter・Escapeに対応。ポータルにも現在のテーマを引き継ぎます。controlSize は TextField と同じ段（sm 32px・md 密度・lg 48px）で、並べる入力と同じ値にします。選択肢の一覧の文字は、どの大きさでも開く前の文字と左端がそろいます。`{ label, options }` を混ぜると、見出しの付いたまとまりにします。',
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
/** 選択肢を開いた状態。配置の検査は、この Story で選択肢の一覧を測ります。 */
export const Open: Story = {
  args: { defaultValue: 'standard' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));
    await expect(within(canvasElement.ownerDocument.body).getByRole('listbox')).toBeVisible();
  },
};
export const Small: Story = { args: { controlSize: 'sm', defaultValue: 'standard' } };
export const Large: Story = { args: { controlSize: 'lg', defaultValue: 'standard' } };
const grouped = [
  {
    label: '東日本',
    options: [
      { value: 'sapporo', label: '札幌' },
      { value: 'tokyo', label: '東京' },
    ],
  },
  {
    label: '西日本',
    options: [
      { value: 'osaka', label: '大阪' },
      { value: 'fukuoka', label: '福岡' },
    ],
  },
];
/** 見出しの付いたまとまり。開いた状態で測ります。 */
export const GroupedOpen: Story = {
  args: { label: '拠点', options: grouped, defaultValue: 'tokyo' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));
    const list = within(canvasElement.ownerDocument.body).getByRole('listbox');
    await expect(within(list).getByRole('group', { name: '西日本' })).toBeVisible();
  },
};
/** 小さな形を開いた状態。選択肢の文字は、開く前の文字と同じ左端から始まります。 */
export const SmallOpen: Story = {
  args: { controlSize: 'sm', defaultValue: 'standard' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));
    await expect(within(canvasElement.ownerDocument.body).getByRole('listbox')).toBeVisible();
  },
};
/** 大きな形を開いた状態。 */
export const LargeOpen: Story = {
  args: { controlSize: 'lg', defaultValue: 'standard' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox'));
    await expect(within(canvasElement.ownerDocument.body).getByRole('listbox')).toBeVisible();
  },
};
