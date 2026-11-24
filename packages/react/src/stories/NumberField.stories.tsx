import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { NumberField } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/NumberField',
  component: NumberField,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '数の欄',
          selector: '.lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        { name: '単位の並び', selector: '.lv-input-group', checks: ['fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '数を入れる欄。数字は等幅で、全角の数字・記号も受け、離れると桁区切りの書式（1,234.5）に直します。step を決めると ↑・↓ で増減し、min・max で止まります。数でない文字・小数の桁の超え・min と max の外は、離れたときに直し方のわかる文を出し、値は null にします。単位は値に含めず unit に書きます。',
      },
    },
  },
  args: { label: '数量', unit: '個', chars: 8, min: 1, max: 999, step: 1, hint: '1から999まで' },
} satisfies Meta<typeof NumberField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: 120 } };
/** 金額：桁区切りと小数の桁。 */
export const Money: Story = {
  args: {
    label: '単価',
    unit: '円',
    chars: 12,
    min: 0,
    max: undefined,
    step: undefined,
    fractionDigits: 0,
    hint: undefined,
    defaultValue: 1234567,
  },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: 3 } };
/** 範囲の外を入れて離れたとき。 */
export const OutOfRange: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: '数量' }), '１０００');
    await userEvent.tab();
    await expect(c.getByText('999個以下の数を入れてください。')).toBeVisible();
  },
};
