import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Fieldset, TextField, Grid } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Fieldset',
  component: Fieldset,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '入力欄',
          selector: '.lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        { name: 'まとまりの名前', selector: '.lv-fieldset > legend', checks: ['line-grid'] },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '1つの問いに答える複数の入力のまとまりです。legend の名前は、中の入力の名前に先立って読み上げます。必須の印は legend に付け、まとまりの名前と一緒に読み上げます。中の入力の required は、それぞれに付けます。',
      },
    },
  },
  args: {
    legend: 'お名前',
    hint: '戸籍に書かれたとおりに入力してください。',
    children: (
      <Grid minWidth="10rem" gap={4}>
        <TextField label="姓" autoComplete="family-name" />
        <TextField label="名" autoComplete="given-name" />
      </Grid>
    ),
  },
} satisfies Meta<typeof Fieldset>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = {
  args: {
    required: true,
    children: (
      <Grid minWidth="10rem" gap={4}>
        <TextField label="姓" autoComplete="family-name" required />
        <TextField label="名" autoComplete="given-name" required />
      </Grid>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('group', { name: /^お名前\s*必須$/ }),
    ).toBeVisible();
  },
};
export const Error: Story = {
  args: { required: true, error: '姓と名の両方を入力してください。' },
};
export const Disabled: Story = { args: { disabled: true } };
