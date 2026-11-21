import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { DropdownMenu, Button, IconButton, type MenuItem } from '../index';
import { useState } from 'react';
import { ArrowDownUp, Copy, FolderInput, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const rowActions = (onSelect: () => void): MenuItem[] => [
  { label: '編集', icon: <Pencil />, shortcut: '⌘E', onSelect },
  { label: '複製', icon: <Copy />, shortcut: '⌘D', onSelect },
  { label: '担当を変える', onSelect },
  { type: 'separator' },
  { label: '削除', icon: <Trash2 />, tone: 'danger', onSelect },
];

const meta = {
  title: 'Components/Overlays/DropdownMenu',
  component: DropdownMenu,
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
        {
          name: 'メニュー',
          selector: '.lv-menu',
          checks: [
            'padding-equal',
            'fits',
            { textEdge: 'start', of: '.lv-menu-label, .lv-menu-heading' },
            { textEdge: 'end', of: '.lv-menu-shortcut' },
          ],
        },
        {
          name: 'メニューの項目',
          selector: '.lv-menu-item:not([data-described])',
          checks: ['inset-y', 'control-height', { icon: '.lv-menu-lead', text: '.lv-menu-label' }],
        },
        {
          // Two lines: the box is taller than a control, and the icon sits on the label's line.
          name: '説明のあるメニューの項目',
          selector: '.lv-menu-item[data-described]',
          checks: ['grid-height', { icon: '.lv-menu-lead', text: '.lv-menu-label' }],
        },
        {
          name: '入れ子を開く項目の矢印',
          selector: '.lv-menu-item:has(> .lv-menu-sub-icon)',
          checks: [{ icon: '.lv-menu-sub-icon', text: '.lv-menu-label' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '押すと開く操作の一覧。表の行の「その他の操作」、並べ替えの選択、表示する列の切り替えに使います。矢印キー・Home / End・文字での選択・Escape に対応し、閉じるとフォーカスを開いた元に戻します。アイコンの列は幅が決まっていて、アイコンのない項目も文字の開始位置がそろいます。危険な操作は tone: "danger" で赤の文字にし、label にも「削除」と書きます。項目の description は下に補足を出して読み上げに添え、{ type: "group" } は見出しの付いたまとまり、{ type: "submenu" } は入れ子のメニューです（右矢印で開き、左矢印か Escape でその入れ子だけ閉じて親の項目へ戻ります。入れ子は1段まで）。side で開く向きを選べます。',
      },
    },
  },
  args: {
    trigger: <IconButton variant="secondary" label="W-1024 の操作" icon={<MoreHorizontal />} />,
    items: rowActions(fn()),
  },
  argTypes: { items: { control: false }, trigger: { control: false } },
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RowActions: Story = {};
/** 開いた状態。配置の検査は、この Story でメニューの中を測ります。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'W-1024 の操作' }));
    const menu = await within(canvasElement.ownerDocument.body).findByRole('menu');
    await expect(menu).toBeVisible();
    await expect(within(menu).getByRole('menuitem', { name: /削除/ })).toBeVisible();
  },
};
/** キーボードで開いて選ぶと、メニューを閉じてフォーカスを開いた元に戻します。 */
export const Keyboard: Story = {
  args: { items: rowActions(fn()) },
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'W-1024 の操作' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('menuitem', { name: /編集/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    const copy = args.items[1];
    if (copy.type === undefined) await expect(copy.onSelect).toHaveBeenCalled();
    await expect(body.queryByRole('menu')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};
/** 入り切りの項目と、1つを選ぶ項目の組。入り切りは押してもメニューを閉じません。 */
export const ChecksAndChoices: Story = {
  render: function Render() {
    const [columns, setColumns] = useState({ owner: true, updated: false });
    const [sort, setSort] = useState('updated');
    return (
      <DropdownMenu
        trigger={<Button icon={<ArrowDownUp size={16} />}>表示</Button>}
        items={[
          {
            type: 'radio',
            label: '並べ替え',
            value: sort,
            onValueChange: setSort,
            options: [
              { value: 'updated', label: '更新が新しい順' },
              { value: 'priority', label: '優先度の高い順' },
              { value: 'name', label: '名前の順' },
            ],
          },
          { type: 'separator' },
          {
            type: 'checkbox',
            label: '担当の列',
            checked: columns.owner,
            onCheckedChange: (owner) => setColumns((c) => ({ ...c, owner })),
          },
          {
            type: 'checkbox',
            label: '最終更新の列',
            checked: columns.updated,
            onCheckedChange: (updated) => setColumns((c) => ({ ...c, updated })),
          },
        ]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '表示' }));
    const body = within(canvasElement.ownerDocument.body);
    const column = await body.findByRole('menuitemcheckbox', { name: '最終更新の列' });
    await userEvent.click(column);
    await expect(column).toHaveAttribute('aria-checked', 'true');
    await expect(body.getByRole('group', { name: '並べ替え' })).toBeVisible();
    await expect(body.getByRole('menuitemradio', { name: '更新が新しい順' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  },
};
const moveTargets = (onSelect: () => void): MenuItem[] => [
  { label: '東京拠点', onSelect },
  { label: '大阪拠点', onSelect },
  { label: '福岡拠点', onSelect },
];
const nested = (onSelect: () => void): MenuItem[] => [
  { label: '編集', icon: <Pencil />, onSelect },
  { type: 'submenu', label: '移す', icon: <FolderInput />, items: moveTargets(onSelect) },
  { type: 'separator' },
  {
    label: '削除',
    icon: <Trash2 />,
    tone: 'danger',
    description: '30日後に完全に消えます。',
    onSelect,
  },
];
/** 入れ子のメニュー。右矢印で開き、左矢印か Escape で親の項目へ戻ります。 */
export const Submenu: Story = {
  args: { items: nested(fn()) },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'W-1024 の操作' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('menuitem', { name: /編集/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    await expect(await body.findByRole('menuitem', { name: '東京拠点' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(body.getByRole('menuitem', { name: /移す/ })).toHaveFocus();
    // Escape closes only the submenu, not the whole menu.
    await userEvent.keyboard('{ArrowRight}');
    await expect(await body.findByRole('menuitem', { name: '東京拠点' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(body.getByRole('menuitem', { name: /移す/ })).toHaveFocus();
  },
};
/** 入れ子を開いた状態。配置の検査は、この Story で入れ子のメニューも測ります。 */
export const SubmenuOpen: Story = {
  args: { items: nested(fn()) },
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole('button', { name: 'W-1024 の操作' }).focus();
    await userEvent.keyboard('{Enter}');
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('menuitem', { name: /編集/ });
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    await expect(await body.findByRole('menuitem', { name: '東京拠点' })).toBeVisible();
  },
};
/** 見出しの付いたまとまりと、項目の補足。 */
export const GroupsAndDescriptions: Story = {
  args: {
    trigger: <Button icon={<FolderInput size={16} />}>書き出す</Button>,
    items: [
      {
        type: 'group',
        label: '表の形',
        items: [
          { label: 'CSV', description: '表計算ソフトで開けます。', onSelect: fn() },
          { label: 'JSON', description: 'ほかのシステムに取り込むとき。', onSelect: fn() },
        ],
      },
      { type: 'separator' },
      {
        type: 'group',
        label: '文書の形',
        items: [{ label: 'PDF', description: '印刷や配布に。', onSelect: fn() }],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '書き出す' }));
    const body = within(canvasElement.ownerDocument.body);
    const csv = await body.findByRole('menuitem', { name: 'CSV' });
    await expect(csv).toHaveAccessibleDescription('表計算ソフトで開けます。');
    await expect(body.getByRole('group', { name: '表の形' })).toContainElement(csv);
  },
};
/** 上に開く形。画面の下の端に置いた操作に使います。 */
export const SideTop: Story = {
  args: { side: 'top' },
  render: (args) => (
    <div style={{ paddingTop: 200 }}>
      <DropdownMenu {...args} />
    </div>
  ),
};
