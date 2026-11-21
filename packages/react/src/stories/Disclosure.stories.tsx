import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Disclosure } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Disclosure',
  component: Disclosure,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '開閉のボタン',
          selector: '.lv-disclosure-trigger',
          checks: [
            'grid-height',
            'line-grid',
            { icon: '.lv-disclosure-icon svg', text: '.lv-disclosure-summary' },
          ],
        },
        {
          name: '開閉の中身',
          selector: '.lv-disclosure:has(.lv-disclosure-content[data-state="open"])',
          checks: [
            'fits',
            { textEdge: 'start', of: '.lv-disclosure-summary, .lv-disclosure-content p' },
          ],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '1つの補足を開閉する小さなボタンと中身。Accordion と違って見出しを持たず、文の流れの中に置きます。開閉は矢印の向きに加えて aria-expanded で読み上げます。開いた中身の左端は、ボタンの文字の左端にそろえます。',
      },
    },
  },
  args: {
    summary: '詳しい条件',
    children: <p style={{ margin: 0 }}>18歳以上で、国内に住んでいる人が申し込めます。</p>,
  },
} satisfies Meta<typeof Disclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '詳しい条件' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  },
};
export const Open: Story = { args: { defaultOpen: true } };
/** ボタンの言葉が2行に折り返しても、矢印は1行目に合わせます。 */
export const LongSummary: Story = {
  render: (args) => (
    <div style={{ width: 200 }}>
      <Disclosure {...args} />
    </div>
  ),
  args: { summary: '申し込みできる人と、そろえる書類の詳しい条件', defaultOpen: true },
};
