import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SegmentedControl } from '../index';
import { LayoutGrid, List } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '切り替えの項目',
          selector: '.lv-segmented-item',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            { icon: '.lv-segmented-icon' },
          ],
        },
        {
          name: '切り替え',
          selector: '.lv-segmented',
          checks: [{ sameHeight: '.lv-segmented-item' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '同じ中身の表示の形を切り替えます（一覧・カード、日・週・月）。中身の領域を切り替えるなら Tabs、フォームで値を選ぶなら RadioGroup を使います。見た目と操作は ViewSwitch と同じで、矢印キーで移ります。選んだものは面・線・太い文字で示し、色だけにしません。選んでいるものをもう一度押しても外れません。',
      },
    },
  },
  args: {
    label: '期間',
    items: [
      { value: 'day', label: '日' },
      { value: 'week', label: '週' },
      { value: 'month', label: '月' },
    ],
    defaultValue: 'week',
    onValueChange: fn(),
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
/** アイコンを添えても、言葉は消しません。 */
export const WithIcons: Story = {
  args: {
    label: '表示の形',
    items: [
      { value: 'list', label: '一覧', icon: <List /> },
      { value: 'grid', label: 'カード', icon: <LayoutGrid /> },
    ],
    defaultValue: 'list',
  },
};
export const DisabledItem: Story = {
  args: {
    items: [
      { value: 'day', label: '日' },
      { value: 'week', label: '週' },
      { value: 'month', label: '月', disabled: true },
    ],
  },
};
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: '週' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await expect(canvas.getByRole('radio', { name: '月' })).toHaveAttribute('aria-checked', 'true');
    await expect(args.onValueChange).toHaveBeenCalledWith('month');
    await userEvent.click(canvas.getByRole('radio', { name: '月' }));
    await expect(canvas.getByRole('radio', { name: '月' })).toHaveAttribute('aria-checked', 'true');
  },
};
