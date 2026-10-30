import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Stack, Button, Card, Text, TextField, Select } from '../index';
const meta = {
  title: 'Components/Layout/Stack',
  component: Stack,
  args: { gap: 4 },
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'スタック',
          selector: '.k-stack',
          checks: ['fits', { sameHeight: '.k-input, .k-select-trigger, .k-button' }],
        },
      ],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Column: Story = {
  render: (args) => (
    <Stack {...args}>
      {['ひとつめ', 'ふたつめ', 'みっつめ'].map((t) => (
        <Button key={t}>{t}</Button>
      ))}
    </Stack>
  ),
};
export const Row: Story = { ...Column, args: { direction: 'row', gap: 3 } };
/** 入力欄・選択の欄・ボタンを1行に並べたもの。配置の検査は、高さが揃うかをこの Story で測ります。 */
export const ControlsInRow: Story = {
  args: { direction: 'row', gap: 2, align: 'end' },
  render: (args) => (
    <Stack {...args}>
      <TextField label="キーワード" placeholder="作業名で探す" />
      <Select
        label="状態"
        defaultValue="all"
        options={[
          { value: 'all', label: 'すべて' },
          { value: 'open', label: '進行中' },
        ]}
      />
      <Button variant="primary">検索する</Button>
    </Stack>
  ),
};
