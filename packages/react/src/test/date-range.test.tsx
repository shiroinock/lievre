import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Calendar, DateRangePicker } from '../index';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Calendar range', () => {
  it('marks the ends and the days between in words as well as the band', () => {
    render(<Calendar today="2026-11-22" range={{ start: '2026-11-10', end: '2026-11-13' }} />);
    expect(screen.getByRole('button', { name: /^2026年11月10日.*、期間の始め$/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^2026年11月11日.*、期間の中$/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^2026年11月13日.*、期間の終わり$/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^2026年11月14日\(土\)$/ })).toBeVisible();
  });
});

describe('DateRangePicker', () => {
  it('groups the start and the end under one question', () => {
    render(<DateRangePicker label="宿泊の期間" hint="チェックインとチェックアウトの日" />);
    const group = screen.getByRole('group', { name: '宿泊の期間' });
    expect(group).toHaveAccessibleDescription('チェックインとチェックアウトの日');
    expect(within(group).getByRole('group', { name: '開始日' })).toBeInTheDocument();
    expect(within(group).getByRole('group', { name: '終了日' })).toBeInTheDocument();
  });
  it('reports both ends and shows the range in the calendar', async () => {
    const onValueChange = vi.fn();
    render(
      <DateRangePicker
        label="宿泊の期間"
        today="2026-11-22"
        defaultValue={{ start: '2026-11-24', end: null }}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '終了日をカレンダーから選ぶ' }));
    const dialog = await screen.findByRole('dialog', { name: '終了日をカレンダーから選ぶ' });
    // Days before the start cannot be the end.
    expect(within(dialog).getByRole('button', { name: /^2026年11月23日/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: /^2026年11月27日/ }));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-11-24', end: '2026-11-27' });
    await userEvent.click(screen.getByRole('button', { name: '開始日をカレンダーから選ぶ' }));
    const again = await screen.findByRole('dialog', { name: '開始日をカレンダーから選ぶ' });
    expect(
      within(again).getByRole('button', { name: /^2026年11月25日.*、期間の中$/ }),
    ).toBeVisible();
  });
  it('does not take an end before the start', async () => {
    const onValueChange = vi.fn();
    render(
      <DateRangePicker
        label="宿泊の期間"
        defaultValue={{ start: '2026-12-10', end: null }}
        onValueChange={onValueChange}
      />,
    );
    const end = screen.getByRole('group', { name: '終了日' });
    await userEvent.type(within(end).getByRole('textbox', { name: '年' }), '2026');
    await userEvent.type(within(end).getByRole('textbox', { name: '月' }), '12');
    await userEvent.type(within(end).getByRole('textbox', { name: '日' }), '5');
    await userEvent.tab();
    await userEvent.tab();
    await settle();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(
      await screen.findByText('2026年12月10日以降の日付を入れてください。'),
    ).toBeInTheDocument();
  });
  it('lets go of the end when the start moves past it', async () => {
    const onValueChange = vi.fn();
    render(
      <DateRangePicker
        label="宿泊の期間"
        defaultValue={{ start: '2026-12-01', end: '2026-12-05' }}
        onValueChange={onValueChange}
      />,
    );
    const start = screen.getByRole('group', { name: '開始日' });
    const day = within(start).getByRole('textbox', { name: '日' });
    await userEvent.clear(day);
    await userEvent.type(day, '8');
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-12-08', end: null });
  });
  it('sends both ends with their names', () => {
    const { container } = render(
      <form>
        <DateRangePicker
          label="宿泊の期間"
          name={{ start: 'checkin', end: 'checkout' }}
          defaultValue={{ start: '2026-12-01', end: '2026-12-05' }}
        />
      </form>,
    );
    const data = new FormData(container.querySelector('form')!);
    expect([data.get('checkin'), data.get('checkout')]).toEqual(['2026-12-01', '2026-12-05']);
  });
  it('has no axe violations', async () => {
    const { container } = render(
      <DateRangePicker
        label="宿泊の期間"
        defaultValue={{ start: '2026-12-01', end: '2026-12-05' }}
      />,
    );
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
