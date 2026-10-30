import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Popover, Button, Checkbox, IconButton, Stack, Text } from '../index';
import { useState } from 'react';
import { Info, ListFilter } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Overlays/Popover',
  component: Popover,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '開くボタン',
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
          name: 'アイコンだけの開くボタン',
          selector: '.lv-icon-button',
          checks: ['inset-x', 'inset-y', 'control-height', 'square'],
        },
        { name: 'ポップオーバー', selector: '.lv-popover', checks: ['padding-equal', 'fits'] },
        {
          name: 'チェックボックスの欄',
          selector: '.lv-check-field',
          checks: [{ icon: '.lv-checkbox', text: '.lv-check-label' }],
        },
        {
          name: 'ポップオーバーの操作',
          selector: '.lv-popover-actions',
          checks: [{ sameHeight: '.lv-button' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '押すと開く、操作できる中身のパネル。絞り込みの条件や表示の設定に使います。中に押せるもの・入力できるものがないなら Tooltip を使います（Tooltip はホバーとフォーカスで出る、説明の短い文だけ）。Escape と外側を押すと閉じ、フォーカスを開いた元に戻します。影を使わず、1px の線と面で浮かせ、矢印の飾りは付けません。',
      },
    },
  },
  args: {
    trigger: <Button icon={<ListFilter size={16} />}>絞り込み</Button>,
    title: '状態で絞り込む',
    children: null,
  },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [states, setStates] = useState(['running']);
    const toggle = (value: string) => (checked: boolean | 'indeterminate') =>
      setStates((prev) => (checked === true ? [...prev, value] : prev.filter((s) => s !== value)));
    return (
      <Popover {...args} open={open} onOpenChange={setOpen}>
        <Stack gap={3}>
          <Checkbox
            label="実行中"
            checked={states.includes('running')}
            onCheckedChange={toggle('running')}
          />
          <Checkbox
            label="確認待ち"
            checked={states.includes('review')}
            onCheckedChange={toggle('review')}
          />
          <Checkbox
            label="完了"
            hint="過去30日に完了したものだけ"
            checked={states.includes('done')}
            onCheckedChange={toggle('done')}
          />
          <div className="lv-popover-actions">
            <Button size="sm" onClick={() => setStates([])}>
              条件を外す
            </Button>
            <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
              適用
            </Button>
          </div>
        </Stack>
      </Popover>
    );
  },
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** 開いた状態。配置の検査は、この Story でパネルの中を測ります。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '絞り込み' }));
    const body = within(canvasElement.ownerDocument.body);
    const panel = await body.findByRole('dialog', { name: '状態で絞り込む' });
    await expect(panel).toBeVisible();
    await expect(body.getByRole('checkbox', { name: '実行中' })).toHaveFocus();
  },
};
/** Escape と外側を押すと閉じ、フォーカスを開いた元に戻します。中の「適用」で閉じるときは open を持ちます。 */
export const OpenClose: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '絞り込み' });
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(body.getByRole('button', { name: '適用' }));
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};
/** 画面の右端にあっても、パネルは画面の内側に収まる位置に回ります。 */
export const AtEdge: Story = {
  args: {
    trigger: <IconButton variant="secondary" label="表示の説明" icon={<Info />} />,
    title: '表示の説明',
    align: 'start',
  },
  render: (args) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Popover {...args}>
        <Text size="small">数値は毎分更新します。表の並びは、最後に押した見出しの順です。</Text>
      </Popover>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '表示の説明' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: '表示の説明' }),
    ).toBeVisible();
  },
};
