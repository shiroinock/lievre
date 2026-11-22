import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { LayoutGate } from '../test/layout/declare';
import { Button, CommandPalette, Kbd, Text, describeHotkey, type CommandItem } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const commands: CommandItem[] = [
  { value: 'home', label: 'ホームへ移動', kana: 'ほーむへいどう', group: '移動', shortcut: 'G H' },
  {
    value: 'tasks',
    label: '作業の一覧へ移動',
    kana: 'さぎょうのいちらんへいどう',
    group: '移動',
    shortcut: 'G T',
  },
  {
    value: 'settings',
    label: '設定を開く',
    kana: 'せっていをひらく',
    keywords: ['settings', 'preferences'],
    group: '移動',
  },
  {
    value: 'new',
    label: '新しい作業を作る',
    kana: 'あたらしいさぎょうをつくる',
    keywords: ['新規'],
    group: '操作',
    shortcut: 'N',
  },
  {
    value: 'export',
    label: 'CSV で書き出す',
    kana: 'しーえすぶいでかきだす',
    description: '表示中の 128 件',
    group: '操作',
  },
  {
    value: 'archive',
    label: '選んだ作業をしまう',
    kana: 'えらんださぎょうをしまう',
    description: '作業を選ぶと使えます',
    group: '操作',
    disabled: true,
  },
  { value: 'theme', label: 'Ink のテーマにする', kana: 'いんくのてーまにする', group: '表示' },
  { value: 'density', label: '詰めた表示にする', kana: 'つめたひょうじにする', group: '表示' },
  // No group: it sits after the last group, below a rule, not under its heading.
  { value: 'help', label: 'ヘルプを開く', kana: 'へるぷをひらく' },
];

const meta = {
  title: 'Components/Overlays/CommandPalette',
  component: CommandPalette,
  parameters: {
    layoutGate: {
      parts: [
        { name: '開くボタン', selector: '.lv-button', checks: ['control-height', 'inset-y'] },
        {
          name: '探す欄',
          selector: '.lv-command-palette-search .lv-input',
          checks: ['inset-y', 'control-height'],
        },
        {
          name: '項目',
          selector: '.lv-command-palette-item',
          checks: ['inset-y', 'control-height'],
        },
        { name: 'パレット', selector: '.lv-command-palette-search', checks: ['padding-equal'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'キーの近道（既定は ⌘K / Ctrl+K）で開く、コマンドを探して実行するパレット。開くと入力欄にフォーカスし、打つと名前・読み・探し言葉・補足で絞り込みます（全角と半角・カタカナとひらがな・大文字と小文字の違いは無視します）。↑↓ で項目を移り、Enter で実行し、Esc で閉じます。最初に選べる項目を選びかけにしておくので、打って Enter で一番合うものを実行できます。日本語の変換中は、絞り込みも実行も閉じもしません。閉じると、フォーカスは開く前にあった場所へ戻り、そのあとで項目の onSelect を呼びます。開くボタンにはキーを Kbd で見せ、aria-keyshortcuts を付けます。開くキーは hotkey で変えられます。',
      },
    },
  },
  args: { items: commands },
} satisfies Meta<typeof CommandPalette>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 開くボタンと、キーの近道。ボタンを押すか ⌘K / Ctrl+K で開きます。 */
export const Default: Story = {};

/** 開いた状態。項目はまとまりの見出しの下に並び、最初の項目を選びかけにしています。開いたまま終わります。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'コマンドを探す' }));
    const body = within(canvasElement.ownerDocument.body);
    const input = await body.findByRole('combobox', { name: 'コマンド' });
    await expect(input).toHaveFocus();
    await expect(body.getByRole('group', { name: '移動' })).toBeVisible();
    await expect(input).toHaveAttribute(
      'aria-activedescendant',
      body.getByRole('option', { name: /ホームへ移動/ }).id,
    );
  },
};

/** 読みで絞り込んだ状態。「さぎょう」で、作業に関わる項目だけが残ります。選べない項目は、矢印キーで飛ばします。 */
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'コマンドを探す' }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByRole('combobox'), 'さぎょう');
    await expect(body.getAllByRole('option')).toHaveLength(3);
    await expect(body.queryByRole('group', { name: '表示' })).toBeNull();
  },
};

/** 一致する項目がないとき。 */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'コマンドを探す' }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByRole('combobox'), 'ぞぞぞ');
    await expect(
      await body.findByText('一致するコマンドがありません', { selector: 'li' }),
    ).toBeVisible();
  },
};

/** 実行して閉じる流れ。Enter で実行すると、フォーカスは開くボタンへ戻り、結果を画面に書きます。 */
export const RunCommand: Story = {
  render: (args) => {
    const [last, setLast] = useState<string>();
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <CommandPalette {...args} onSelect={(value) => setLast(value)} />
        <Text role="status">{last ? `「${last}」を実行しました` : 'まだ何も実行していません'}</Text>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole('button', { name: 'コマンドを探す' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByRole('combobox'), 'せってい');
    await userEvent.keyboard('{Enter}');
    await expect(await c.findByText('「settings」を実行しました')).toBeVisible();
    await expect(trigger).toHaveFocus();
  },
};

const palette = { key: 'p', mod: true, shift: true };
/** 開くキーを変えた形（⌘⇧P / Ctrl+Shift+P）。開くボタンを自前にするときは、describeHotkey でキーの見た目と aria-keyshortcuts をそろえます。 */
export const CustomHotkey: Story = {
  render: (args) => {
    const keys = describeHotkey(palette);
    return (
      <CommandPalette
        {...args}
        hotkey={palette}
        trigger={
          <Button variant="ghost" aria-keyshortcuts={keys.aria}>
            操作を探す
            <span aria-hidden className="lv-command-palette-key">
              <Kbd>{keys.label}</Kbd>
            </span>
          </Button>
        }
      />
    );
  },
};
