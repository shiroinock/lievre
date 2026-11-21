import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { DateField } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/DateField',
  component: DateField,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '年月日の欄',
          selector: '.lv-date-field .lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        {
          name: '年月日の並び',
          selector: '.lv-date-field-parts',
          checks: ['fits', { sameHeight: '.lv-input' }, { baseline: '.lv-label' }],
        },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '年・月・日を3つの欄に直接入れる日付の入力。生年月日や届け出の日など、カレンダーでは選びにくい日に使います。数字は等幅で、全角の数字も受け、欄を離れると半角に直します。まとまりを離れたときに、足りない欄・存在しない日（2月30日）・min と max の外を確かめ、直し方のわかる文を出します。値は ISO 8601 の日付（2026-11-22）で、確かめて通るまでは null です。',
      },
    },
  },
  args: { label: '生年月日', hint: '例：1990 4 1', autoComplete: 'bday' },
} satisfies Meta<typeof DateField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: '1990-04-01' } };
export const Required: Story = { args: { required: true } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '1990-04-01' } };
/** 存在しない日を入れて離れたとき。直し方のわかる文が出ます。 */
export const NoSuchDay: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole('textbox', { name: '年' }), '２０２６');
    await userEvent.type(c.getByRole('textbox', { name: '月' }), '2');
    await userEvent.type(c.getByRole('textbox', { name: '日' }), '30');
    await userEvent.tab();
    await expect(c.getByText('2026年2月30日はありません。日付を確かめてください。')).toBeVisible();
    await expect(c.getByRole('textbox', { name: '年' })).toHaveValue('2026');
  },
};
/** 受け付ける範囲（min・max）の外。 */
export const OutOfRange: Story = {
  args: {
    label: '希望日',
    hint: undefined,
    autoComplete: undefined,
    min: '2026-12-01',
    defaultValue: '2026-11-22',
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('textbox', { name: '日' }));
    await userEvent.tab();
    await expect(c.getByText('2026年12月1日以降の日付を入れてください。')).toBeVisible();
  },
};
