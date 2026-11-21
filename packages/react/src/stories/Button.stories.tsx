import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen, ChevronDown, ArrowUpRight, Pin } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ボタン',
          selector: '.lv-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
        {
          name: '幅いっぱいのボタン',
          selector: '.lv-button--block',
          checks: ['inset-x', 'inset-y', 'control-height', 'fits'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '主要操作はprimaryを1つ。通常はsecondary、補助操作はghost。loading中は再クリックを防ぎ、ボタンのラベルは残します。iconEnd は押したあとに起きること（開く・外へ移る）を示すアイコン、block は幅いっぱい。pressed を渡すと入り切りのボタン（aria-pressed）になります。disabledReason を渡すと、押せないままフォーカスが届き、理由をツールチップと読み上げで伝えます。',
      },
    },
  },
  args: { children: '保存する', size: 'md', loading: false, disabled: false, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost', children: '取り消す' } };
export const Danger: Story = { args: { variant: 'danger', children: '削除する' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const WithIcon: Story = { args: { icon: <Plus size={15} />, children: '作業を追加' } };
export const IconOnly: Story = {
  args: { children: <Settings2 size={16} />, 'aria-label': '設定を開く' },
};
export const Loading: Story = { args: { loading: true, children: '保存中' } };
export const Disabled: Story = { args: { disabled: true } };
export const ClickInteraction: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
export const IconEnd: Story = {
  args: { iconEnd: <ChevronDown />, children: '並べ替え' },
};
export const ExternalLinkIcon: Story = {
  args: { variant: 'ghost', iconEnd: <ArrowUpRight />, children: '別の画面で開く' },
};
export const Block: Story = {
  args: { variant: 'primary', block: true, children: '次へ進む' },
};
function PressedDemo() {
  const [pinned, setPinned] = useState(false);
  return (
    <Button icon={<Pin size={16} />} pressed={pinned} onClick={() => setPinned((p) => !p)}>
      上に固定
    </Button>
  );
}
/** 押して入り切りするボタン。入っているときは面と線と太い文字で示します。 */
export const Pressed: Story = {
  render: () => <PressedDemo />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '上に固定' });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};
/** 押せない理由。フォーカスが届き、理由をツールチップと読み上げで伝えます。 */
export const DisabledReason: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    disabledReason: '必須の項目をすべて入力すると送れます。',
    children: '送る',
  },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: '送る' });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAccessibleDescription('必須の項目をすべて入力すると送れます。');
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
