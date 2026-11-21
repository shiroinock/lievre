import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { useState } from 'react';
import { Chip, ChipGroup } from '../index';
import { Tag } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/Chip',
  component: Chip,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'チップ',
          // The cut-off label is measured by its whole text, past the ellipsis, so it is held
          // to the height and the vertical centre only (the part below).
          selector: '.lv-chip:not([data-truncated] *)',
          checks: [
            'control-height',
            'inset-x',
            'inset-y',
            'fits',
            { icon: 'svg', text: '.lv-chip-label' },
          ],
        },
        {
          name: '言葉を切ったチップ',
          selector: '.lv-chip:is([data-truncated] *)',
          checks: ['control-height', 'inset-y', 'fits'],
        },
        { name: 'チップを外すボタン', selector: '.lv-chip-remove', checks: ['square'] },
        { name: 'チップの並び', selector: '.lv-chip-group', checks: ['fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '分類や選んだ値を示す小さな札。状態（稼働中・要確認）は Badge、分類と選んだ値は Chip と使い分けます。何も渡さなければ表示だけの札（タグ）、onRemove で外せる札、selected・onSelectedChange で押して入り切りする絞り込みの札になります。選んでいる札は緑ではなく強調色の線と選択の面で示し、印（チェック）も添えます。外すボタンは「{label}を外す」と読み上げ、左右の余白は外すボタンのある側も同じです。',
      },
    },
  },
  args: { label: '営業部' },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 表示だけの札（タグ）。 */
export const Default: Story = {};
export const WithIcon: Story = { args: { icon: <Tag /> } };
export const Small: Story = { args: { size: 'sm' } };
/** 外せる札。選んだ絞り込みの条件を並べ、押すと外します。 */
export const Removable: Story = {
  render: () => <RemovableDemo />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '東京を外す' }));
    await expect(c.queryByText('東京')).toBeNull();
    await expect(c.getByRole('group', { name: '絞り込みの条件' })).toHaveTextContent('大阪');
  },
};
function RemovableDemo() {
  const [values, setValues] = useState(['東京', '大阪', '名古屋']);
  return (
    <ChipGroup label="絞り込みの条件">
      {values.map((v) => (
        <Chip key={v} label={v} onRemove={() => setValues((all) => all.filter((x) => x !== v))} />
      ))}
    </ChipGroup>
  );
}
export const RemovableSmall: Story = {
  render: () => (
    <ChipGroup label="担当者">
      <Chip size="sm" label="佐藤" onRemove={() => {}} />
      <Chip size="sm" label="鈴木" onRemove={() => {}} />
    </ChipGroup>
  ),
};
/** 押して入り切りする絞り込みの札。選んでいる間はチェックの印が付きます。 */
export const Selectable: Story = {
  render: () => (
    <ChipGroup label="状態で絞り込む">
      <Chip label="稼働中" defaultSelected />
      <Chip label="要確認" defaultSelected={false} />
      <Chip label="停止" defaultSelected={false} disabled />
    </ChipGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const chip = c.getByRole('button', { name: '要確認' });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  },
};
export const Disabled: Story = {
  args: { disabled: true, onRemove: () => {} },
};
/** 長い言葉は幅に収め、末尾を「…」で切ります。 */
export const LongLabel: Story = {
  render: () => (
    <div style={{ width: 200 }} data-truncated>
      <Chip label="とても長い分類の名前で幅に収まらない札" onRemove={() => {}} />
    </div>
  ),
};
