import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { DatePicker } from '../index';
import { expect, userEvent, within, screen } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/DatePicker',
  component: DatePicker,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '年月日の欄',
          selector: '.lv-date-field .lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        {
          name: '年月日とボタンの並び',
          selector: '.lv-date-field-parts',
          checks: ['fits', { sameHeight: '.lv-input, .lv-date-picker-button' }],
        },
        {
          name: 'カレンダーのボタン',
          selector: '.lv-date-picker-button',
          checks: ['square', 'control-height'],
        },
        { name: '日のボタン', selector: '.lv-calendar-day', checks: ['square', 'control-height'] },
        {
          name: 'カレンダーの枠',
          selector: '.lv-date-picker-popover',
          checks: ['fits', 'padding-equal'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '年・月・日の直接入力（DateField）の右に、カレンダーを開くボタンを添えた日付の入力。予約の日・締め切りなど、曜日や近さを見て選ぶ日に使います。打っても、カレンダーで選んでもかまいません。カレンダーは選んだ日（なければ今日）の月で開き、日を選ぶと欄に書いて閉じ、フォーカスをボタンに戻します。props は DateField と同じです。',
      },
    },
  },
  args: { label: '予約の日', hint: '例：2026 12 1', today: '2026-11-22' },
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: '2026-12-10' } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-12-10' } };
/** カレンダーを開いたところ。今日より前は選べません。 */
export const Open: Story = {
  args: { defaultValue: '2026-12-10', min: '2026-11-22' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '予約の日をカレンダーから選ぶ' }));
    await expect(await screen.findByRole('grid', { name: '2026年12月' })).toBeVisible();
  },
};
/** カレンダーで選ぶと、欄に書いて閉じる。 */
export const ChooseFromCalendar: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '予約の日をカレンダーから選ぶ' }));
    await screen.findByRole('grid');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(c.getByRole('textbox', { name: '日' })).toHaveValue('29');
  },
};
