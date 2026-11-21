import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Field } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Field',
  component: Field,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '入力欄',
          selector: '.lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        { name: 'ラベル', selector: '.lv-label', checks: ['line-grid'] },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ラベル・補助文・エラー・必須の印と、入力を結ぶ入れ物です。children の関数が受け取る属性（id・aria-describedby・aria-invalid・required）を、入力の要素にそのまま渡します。TextField・Textarea・Select はこれで組んでいるので、lievre にない入力も同じ形にそろいます。必須は「必須」の文字で示し、読み上げでは入力の required が伝えます。エラーは記号と文で示し、補助文は消しません。',
      },
    },
  },
  args: {
    label: '郵便番号',
    hint: 'ハイフンはなくてもかまいません。',
    children: (control) => (
      <input
        {...control}
        className="lv-input lv-mono"
        inputMode="numeric"
        autoComplete="postal-code"
      />
    ),
  },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = {
  args: { required: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '郵便番号' });
    await expect(input).toBeRequired();
    await expect(within(canvasElement).getByText('必須')).toBeVisible();
  },
};
/** エラーは補助文の下に、記号と一緒に出します。補助文は残します。 */
export const Error: Story = {
  args: { required: true, error: '7桁の数字で入力してください。' },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: '郵便番号' });
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(
      'ハイフンはなくてもかまいません。 7桁の数字で入力してください。',
    );
  },
};
