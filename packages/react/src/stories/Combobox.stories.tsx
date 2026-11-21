import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, Combobox, Dialog, Select, TextField, type ComboboxOption } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const partners: ComboboxOption[] = [
  { value: 'yamada', label: '株式会社ヤマダ製作所', kana: 'かぶしきがいしゃやまだせいさくしょ' },
  { value: 'tokyo', label: '東京商事株式会社', kana: 'とうきょうしょうじかぶしきがいしゃ' },
  { value: 'abc', label: 'ＡＢＣ物流', kana: 'えーびーしーぶつりゅう' },
  { value: 'sample', label: 'サンプル株式会社', kana: 'さんぷるかぶしきがいしゃ' },
  { value: 'hokkaido', label: '北海道ミルク合同会社', kana: 'ほっかいどうみるくごうどうがいしゃ' },
  { value: 'osaka', label: '大阪精機', kana: 'おおさかせいき' },
  {
    value: 'fukuoka',
    label: '福岡システムズ（取引停止）',
    kana: 'ふくおかしすてむず',
    disabled: true,
  },
  { value: 'xyz', label: 'XYZ Trading', kana: 'えっくすわいぜっととれーでぃんぐ' },
];
const meta = {
  title: 'Components/Inputs/Combobox',
  component: Combobox,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '入力欄',
          selector: '.lv-combobox-input',
          checks: ['inset-y', 'control-height'],
        },
        {
          name: '開閉のボタン',
          selector: '.lv-combobox-button',
          checks: ['square', { icon: 'svg' }],
        },
        {
          name: '開閉のアイコンと文字',
          selector: '.lv-combobox',
          checks: [{ icon: '.lv-combobox-button svg', text: '.lv-combobox-input', block: true }],
        },
        {
          name: '候補',
          selector: '.lv-combobox-content .lv-select-item',
          checks: ['inset-y', 'control-height'],
        },
        {
          name: '並べた欄',
          selector: '.lv-form-row',
          checks: [{ sameHeight: '.lv-input, .lv-select-trigger' }],
        },
        { name: '並べた選択の欄', selector: '.lv-select-trigger', checks: ['control-height'] },
        { name: 'ダイアログを開くボタン', selector: '.lv-button', checks: ['control-height'] },
        { name: 'ダイアログを閉じるボタン', selector: '.lv-icon-button', checks: ['square'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '候補を打って絞り込み、1つを選ぶ入力。取引先・担当者・品目など、Select では探しにくい数のときに使います。絞り込みは全角と半角・カタカナとひらがな・大文字と小文字の違いを無視し、読み（kana）でも探せます。日本語の変換中は、絞り込みも確定もしません。矢印キーで候補を移り、Enter で選び、Esc で一覧を閉じます（もう一度押すと文字を消します）。開くと候補の数を読み上げます。一覧の枠は Select と同じ見た目と重なりで、ダイアログの中でも Esc は一覧だけを閉じます。',
      },
    },
  },
  args: { label: '取引先', options: partners, placeholder: '社名か読みで探す' },
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 'tokyo' } };
export const Required: Story = { args: { required: true, hint: '請求書の宛先になります。' } };
export const Error: Story = { args: { error: '取引先を選んでください。' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: 'osaka' } };
export const Small: Story = { args: { controlSize: 'sm' } };
export const Large: Story = { args: { controlSize: 'lg' } };
/** 読みで絞り込んだ状態。「とうきょう」で漢字の社名が出ます。開いたまま終わります。 */
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('combobox', { name: '取引先' }), 'とうきょう');
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('option', { name: '東京商事株式会社' })).toBeVisible();
    await expect(body.getAllByRole('option')).toHaveLength(1);
  },
};
/** 一覧を開いた状態。選んでいる候補には印が付きます。 */
export const Open: Story = {
  args: { defaultValue: 'abc' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '候補を開く' }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('option', { name: 'ＡＢＣ物流' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};
/** 一致する候補がないとき。 */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('combobox'), 'ぞぞぞ');
    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByText('一致する候補がありません', { selector: 'li' }),
    ).toBeVisible();
  },
};
/** TextField・Select と並べたとき、高さがそろいます。 */
export const BesideFields: Story = {
  render: (args) => (
    <div className="lv-form-row" style={{ display: 'flex', gap: 16, alignItems: 'end' }}>
      <div style={{ flex: 1 }}>
        <Combobox {...args} />
      </div>
      <div style={{ flex: 1 }}>
        <TextField label="担当者" />
      </div>
      <div style={{ flex: 1 }}>
        <Select
          label="区分"
          options={[
            { value: 'a', label: '仕入れ' },
            { value: 'b', label: '販売' },
          ]}
        />
      </div>
    </div>
  ),
};
/** ダイアログの中。Esc の1回目は一覧だけを閉じ、2回目でダイアログが閉じます（Select と同じ）。 */
export const InDialog: Story = {
  render: (args) => (
    <Dialog
      trigger={<Button>取引先を変える</Button>}
      title="取引先を変える"
      description="新しい取引先を選びます。"
    >
      <Combobox {...args} />
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '取引先を変える' }));
    const body = within(canvasElement.ownerDocument.body);
    const input = await body.findByRole('combobox', { name: '取引先' });
    await userEvent.type(input, 'おおさか');
    await expect(await body.findByRole('option', { name: '大阪精機' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(body.queryByRole('option')).toBeNull();
    await expect(body.getByRole('dialog')).toBeVisible();
  },
};
