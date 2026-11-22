import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Stepper } from '../index';
import { expect, within } from 'storybook/test';

const steps = [{ label: '入力' }, { label: '確認' }, { label: '送信' }, { label: '完了' }];
const meta = {
  title: 'Components/Navigation/Stepper',
  component: Stepper,
  parameters: {
    layoutGate: {
      parts: [
        { name: '段の円', selector: '.lv-step-mark', checks: ['square', 'inset-x', 'inset-y'] },
        {
          name: '段',
          selector: '.lv-step',
          checks: ['line-grid', { icon: '.lv-step-mark', text: '.lv-step-label' }],
        },
        { name: '手順の並び', selector: '.lv-stepper', checks: ['fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '画面を分けた手順の、今どこにいるかを示す並び。<ol> で順番を伝え、今の段に aria-current="step" を付けます。済みはチェックの印、今は塗った円と太い文字で示し、読み上げでも「完了」「現在」を添えます。番号は等幅です。段の名前が折り返しても、円は1行目に合ったままです。狭い画面では orientation="vertical" にします。',
      },
    },
  },
  args: { label: '申し込みの手順', steps, current: 1 },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole('list', { name: '申し込みの手順' });
    await expect(within(list).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    await expect(c.getByText('（完了）')).toBeInTheDocument();
  },
};
export const First: Story = { args: { current: 0 } };
export const AllDone: Story = { args: { current: 4 } };
export const Vertical: Story = { args: { orientation: 'vertical', current: 2 } };
/** 段の名前が長く折り返す形。円は1行目に合ったままです。 */
export const LongLabels: Story = {
  render: (args) => (
    <div style={{ width: 360 }}>
      <Stepper {...args} />
    </div>
  ),
  args: {
    steps: [
      { label: '申し込む人の情報を入れる' },
      { label: '書類を添える' },
      { label: '内容を確かめて送る' },
    ],
  },
};
