import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Calendar } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/Calendar',
  component: Calendar,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '日のボタン',
          selector: '.lv-calendar-day',
          checks: ['square', 'inset-x', 'inset-y', 'control-height'],
        },
        {
          name: '月の送りのボタン',
          selector: '.lv-calendar-header .lv-icon-button',
          checks: ['square', 'control-height'],
        },
        { name: 'カレンダー', selector: '.lv-calendar', checks: ['fits', 'grid-height'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '月の表から日付を選ぶ。予約の日・締め切りなど、曜日や近さを見て選ぶ日に使います（生年月日のように遠い日は DateField）。週は日曜から始まります。矢印で日、PageUp / PageDown で月、Shift と合わせて年、Home / End で週の端へ移り、Enter か Space で選びます。今日は下線、選んだ日は塗り、min・max の外の日は打ち消し線で示します。ふつうは DatePicker の中で使います。',
      },
    },
  },
  args: { today: '2026-11-22' },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: '2026-11-10' } };
/** 受け付ける範囲（min・max）。外の日は選べず、月の送りも範囲で止まります。 */
export const WithRange: Story = { args: { min: '2026-11-16', max: '2026-12-12' } };
/** キーボードで月を送って選ぶ。 */
export const Keyboard: Story = {
  args: { autoFocus: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.keyboard('{PageDown}{ArrowRight}{Enter}');
    await expect(c.getByRole('grid', { name: '2026年12月' })).toBeVisible();
    await expect(c.getByRole('button', { name: /^2026年12月23日/ }).closest('td')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};
/** 和暦（calendar="japanese"）。年号の切り替わりの月も、その日の年号で出します。 */
export const Japanese: Story = { args: { calendar: 'japanese' } };
