import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Accordion, type AccordionItem } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const items: AccordionItem[] = [
  {
    value: 'fee',
    title: '手数料はかかりますか',
    content: '申し込みに手数料はかかりません。振り込みの手数料は利用する側の負担です。',
  },
  {
    value: 'change',
    title: '申し込んだあとに内容を変えられますか',
    content: '受付の前なら、申し込みの一覧から変えられます。受付のあとは窓口に連絡してください。',
  },
  {
    value: 'period',
    title: '届くまでの日数',
    content: '受付から5営業日ほどで届きます。',
  },
];
const meta = {
  title: 'Components/Navigation/Accordion',
  component: Accordion,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '開閉の見出しのボタン',
          selector: '.lv-accordion-trigger',
          checks: [
            'grid-height',
            'line-grid',
            { icon: '.lv-accordion-icon svg', text: '.lv-accordion-title' },
          ],
        },
        {
          name: '開いた項目',
          selector: '.lv-accordion-item[data-state="open"]',
          checks: ['fits', { textEdge: 'start', of: '.lv-accordion-title, .lv-accordion-content' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '見出しを押して中身を開閉する並び（よくある質問、申し込みの補足、詳しい条件）。開閉は矢印の向きに加えて aria-expanded で読み上げ、開いた中身は見出しの名前の付いた領域になります。上下の矢印キーで見出しの間を移ります。headingLevel でページの見出しの並びに合わせ、multiple で同時に複数を開けます。1つの補足だけを開閉するなら Disclosure を使います。',
      },
    },
  },
  args: { items, defaultValue: ['fee'] },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const fee = c.getByRole('button', { name: '手数料はかかりますか' });
    await expect(fee).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(c.getByRole('button', { name: '届くまでの日数' }));
    await expect(fee).toHaveAttribute('aria-expanded', 'false');
    await expect(c.getByRole('region', { name: '届くまでの日数' })).toBeVisible();
  },
};
/** 同時に複数を開ける形。 */
export const Multiple: Story = {
  args: { multiple: true, defaultValue: ['fee', 'period'] },
};
/** すべて閉じた形。見出しは h2 にしています。 */
export const Collapsed: Story = {
  args: { defaultValue: [], headingLevel: 2 },
};
/** 見出しが2行に折り返しても、矢印は1行目に合わせます。 */
export const LongHeading: Story = {
  render: (args) => (
    <div style={{ width: 280 }}>
      <Accordion {...args} />
    </div>
  ),
  args: {
    defaultValue: ['change'],
  },
};
