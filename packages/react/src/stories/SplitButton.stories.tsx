import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SplitButton } from '../index';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/SplitButton',
  component: SplitButton,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '主な操作',
          selector: '.lv-button',
          checks: ['inset-x', 'inset-y', 'control-height', { padding: 'button' }, 'fits'],
        },
        {
          name: '開く側のボタン',
          selector: '.lv-icon-button',
          checks: ['inset-x', 'inset-y', 'control-height', 'square'],
        },
        {
          name: '分割ボタン',
          selector: '.lv-button-group',
          checks: [{ sameHeight: ':scope > *' }],
        },
        { name: 'メニュー', selector: '.lv-menu', checks: ['padding-equal'] },
        {
          name: 'メニューの項目',
          selector: '.lv-menu-item',
          checks: ['inset-y', 'control-height'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '主な操作と、そのほかの方法のメニューをつなげたボタン。2つは別のボタンで、Tab で順に移ります。開く側は menuLabel で「何の続きか」を読み上げます。',
      },
    },
  },
  args: {
    children: '保存',
    onClick: fn(),
    menuLabel: '保存のほかの方法',
    items: [
      { label: '下書きとして保存', onSelect: fn() },
      { label: '別名で保存', onSelect: fn() },
    ],
  },
} satisfies Meta<typeof SplitButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Primary: Story = { args: { variant: 'primary' } };
export const Small: Story = { args: { size: 'sm' } };
/** 開いた状態。配置の検査は、この Story でメニューを測ります。 */
export const Open: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '保存' }));
    await expect(args.onClick).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: '保存のほかの方法' }));
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('menuitem', { name: '下書きとして保存' }),
    ).toBeVisible();
  },
};
