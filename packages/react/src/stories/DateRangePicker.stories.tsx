import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { DateRangePicker } from '../index';
import { expect, userEvent, within, screen } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '年月日の欄',
          selector: '.lv-date-range .lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        {
          name: '年月日とボタンの並び',
          selector: '.lv-date-field-parts',
          checks: ['fits', { sameHeight: '.lv-input, .lv-date-picker-button' }],
        },
        { name: '開始日と終了日の並び', selector: '.lv-date-range-parts', checks: ['fits'] },
        { name: 'カレンダーのボタン', selector: '.lv-date-picker-button', checks: ['square'] },
        { name: '日のボタン', selector: '.lv-calendar-day', checks: ['square', 'control-height'] },
        {
          name: '月の送りのボタン',
          selector: '.lv-calendar-header .lv-icon-button',
          checks: ['square', 'control-height'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '開始日と終了日を選ぶ期間の入力。2つの DatePicker を1つの問いにまとめます。予約・絞り込みの期間などに使います。どちらのカレンダーにも開始日から終了日までの期間を、面と読み上げの言葉（期間の始め・中・終わり）で示します。終了日は開始日より前にできず、前の日を入れると直し方のわかる文を出します。',
      },
    },
  },
  args: { label: '宿泊の期間', today: '2026-11-22' },
} satisfies Meta<typeof DateRangePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = {
  args: { defaultValue: { start: '2026-12-01', end: '2026-12-05' } },
};
export const Labels: Story = {
  args: { label: '集計の期間', startLabel: 'いつから', endLabel: 'いつまで', required: true },
};
/** 終了日のカレンダー。開始日より前は選べず、期間を面で示します。 */
export const OpenEnd: Story = {
  args: { defaultValue: { start: '2026-12-01', end: '2026-12-05' } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '終了日をカレンダーから選ぶ' }));
    await expect(await screen.findByRole('grid', { name: '2026年12月' })).toBeVisible();
  },
};
