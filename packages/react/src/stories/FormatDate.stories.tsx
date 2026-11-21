import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { FormatDate } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/FormatDate',
  component: FormatDate,
  parameters: {
    layoutGate: {
      parts: [{ name: '書式の日付', selector: '.lv-format', checks: ['fits'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '日付・日時を日本語の書式で <time datetime> に出します。calendar="japanese" で和暦（令和8年11月22日）、relative で今との差（昨日・3分前）にします。正確な日時は datetime の属性に残ります。\'YYYY-MM-DD\' の文字は、その日として扱います（UTC の0時にはしません）。文の中には、同じ書式の formatDate・formatRelativeTime を使います。',
      },
    },
  },
  args: { value: '2026-11-22' },
} satisfies Meta<typeof FormatDate>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const time = within(canvasElement).getByText('2026年11月22日');
    await expect(time).toHaveAttribute('datetime', '2026-11-22');
  },
};
export const WithWeekday: Story = { args: { weekday: true } };
/** 和暦。年号の切り替わりの日も正しく出ます。 */
export const Japanese: Story = { args: { value: '2019-05-01', calendar: 'japanese' } };
export const DateTime: Story = {
  args: { value: '2026-11-22T09:05:00+09:00', style: 'datetime', timeZone: 'Asia/Tokyo' },
};
/** 今との差。基準の「今」を決めて描いています。 */
export const Relative: Story = {
  args: {
    value: '2026-11-21T09:00:00+09:00',
    relative: true,
    now: new Date('2026-11-22T10:00:00+09:00'),
  },
};
/** 表の日付の列のように、等幅で桁をそろえる形。 */
export const Mono: Story = { args: { style: 'datetime', mono: true, timeZone: 'Asia/Tokyo' } };
