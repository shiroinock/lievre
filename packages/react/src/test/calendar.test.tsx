import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Calendar, DatePicker, Dialog, Button } from '../index';

const day = (name: RegExp | string) => screen.getByRole('button', { name });
const focusedName = () => (document.activeElement as HTMLElement).getAttribute('aria-label');

describe('Calendar', () => {
  it('lays out a month from Sunday with weekday headers and the month as its name', () => {
    render(<Calendar today="2026-11-22" />);
    const grid = screen.getByRole('grid', { name: '2026年11月' });
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['日', '月', '火', '水', '木', '金', '土']);
    // 2026-11-01 is a Sunday: the first row starts with it.
    const firstRow = within(grid).getAllByRole('row')[1];
    expect(within(firstRow).getAllByRole('gridcell')[0]).toHaveTextContent('1');
  });
  it('marks today and the chosen day without color alone', () => {
    render(<Calendar today="2026-11-22" defaultValue="2026-11-10" />);
    expect(day(/^2026年11月22日/)).toHaveAttribute('aria-current', 'date');
    expect(day(/^2026年11月10日/).closest('td')).toHaveAttribute('aria-selected', 'true');
    expect(day(/^2026年11月10日/)).toHaveAttribute('tabindex', '0');
    // The name says so too: readers seldom read the selection of the cell around the button.
    expect(day(/^2026年11月10日\(火\)、選択中$/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: /選択中/ })).toHaveLength(1);
  });
  it('moves by day, week, month, year and to the ends of the week', async () => {
    render(<Calendar today="2026-11-22" autoFocus />);
    expect(focusedName()).toMatch(/^2026年11月22日/);
    await userEvent.keyboard('{ArrowRight}');
    expect(focusedName()).toMatch(/^2026年11月23日/);
    await userEvent.keyboard('{ArrowUp}');
    expect(focusedName()).toMatch(/^2026年11月16日/);
    await userEvent.keyboard('{Home}');
    expect(focusedName()).toMatch(/^2026年11月15日\(日\)/);
    await userEvent.keyboard('{End}');
    expect(focusedName()).toMatch(/^2026年11月21日\(土\)/);
    await userEvent.keyboard('{PageDown}');
    expect(focusedName()).toMatch(/^2026年12月21日/);
    expect(screen.getByRole('grid', { name: '2026年12月' })).toBeInTheDocument();
    await userEvent.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(focusedName()).toMatch(/^2025年12月21日/);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focusedName()).toMatch(/^2026年1月4日/);
  });
  it('chooses with Enter and with the pointer', async () => {
    const onValueChange = vi.fn();
    render(<Calendar today="2026-11-22" autoFocus onValueChange={onValueChange} />);
    await userEvent.keyboard('{ArrowLeft}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-21');
    await userEvent.click(day(/^2026年11月3日/));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-03');
    expect(day(/^2026年11月3日/).closest('td')).toHaveAttribute('aria-selected', 'true');
  });
  it('keeps the focus and the months within min and max', async () => {
    const onValueChange = vi.fn();
    render(
      <Calendar
        today="2026-11-22"
        min="2026-11-20"
        max="2026-12-05"
        autoFocus
        onValueChange={onValueChange}
      />,
    );
    expect(day(/^2026年11月19日/)).toHaveAttribute('aria-disabled', 'true');
    expect(day(/^2026年11月19日/)).toHaveAccessibleName(/選べません$/);
    await userEvent.click(day(/^2026年11月19日/));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '前の月' })).toBeDisabled();
    day(/^2026年11月22日/).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(focusedName()).toMatch(/^2026年11月20日/);
    await userEvent.keyboard('{PageDown}');
    expect(focusedName()).toMatch(/^2026年12月5日/);
    expect(screen.getByRole('button', { name: '次の月' })).toBeDisabled();
  });
  it('hands the focus to the day when a month button reaches the end and is disabled', async () => {
    render(<Calendar today="2026-11-22" min="2026-10-15" max="2026-12-31" />);
    await userEvent.click(screen.getByRole('button', { name: '次の月' }));
    expect(screen.getByRole('button', { name: '次の月' })).toBeDisabled();
    expect(focusedName()).toMatch(/^2026年12月22日/);
    await userEvent.click(screen.getByRole('button', { name: '前の月' }));
    expect(screen.getByRole('button', { name: '前の月' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: '前の月' }));
    expect(screen.getByRole('button', { name: '前の月' })).toBeDisabled();
    expect(focusedName()).toMatch(/^2026年10月22日/);
  });
  it('turns the month with the buttons without taking the focus', async () => {
    render(<Calendar today="2026-11-22" />);
    await userEvent.click(screen.getByRole('button', { name: '次の月' }));
    expect(screen.getByRole('grid', { name: '2026年12月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '次の月' })).toHaveFocus();
  });
  it('has no axe violations', async () => {
    const { container } = render(<Calendar today="2026-11-22" defaultValue="2026-11-10" />);
    const result = await axe.run(container);
    expect(result.violations).toEqual([]);
  });
});

describe('DatePicker', () => {
  it('opens on the chosen month, writes the chosen day into the fields and gives the focus back', async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="予約の日"
        today="2026-11-22"
        defaultValue="2026-12-10"
        onValueChange={onValueChange}
      />,
    );
    const button = screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' });
    await userEvent.click(button);
    const dialog = await screen.findByRole('dialog', { name: '予約の日をカレンダーから選ぶ' });
    expect(within(dialog).getByRole('grid', { name: '2026年12月' })).toBeInTheDocument();
    expect(focusedName()).toMatch(/^2026年12月10日/);
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('2026-12-11');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox', { name: '日' })).toHaveValue('11');
    expect(button).toHaveFocus();
  });
  it('does not check the fields while the calendar is open', async () => {
    render(<DatePicker label="予約の日" today="2026-11-22" />);
    await userEvent.type(screen.getByRole('textbox', { name: '年' }), '2026');
    await userEvent.click(screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' }));
    await screen.findByRole('dialog');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('年・月・日をすべて入れてください。')).toBeNull();
  });
  it('does not check the fields when the button is pressed without taking the focus, as in Safari', async () => {
    render(<DatePicker label="予約の日" today="2026-11-22" />);
    await userEvent.type(screen.getByRole('textbox', { name: '年' }), '2026');
    const button = screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' });
    // Safari: pressing blurs the field to the page, and the button never takes the focus.
    fireEvent.pointerDown(button);
    (document.activeElement as HTMLElement).blur();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.click(button);
    await screen.findByRole('dialog');
    expect(screen.queryByText('年・月・日をすべて入れてください。')).toBeNull();
  });
  it('checks again on leaving after a press that opened nothing', async () => {
    render(<DatePicker label="予約の日" today="2026-11-22" />);
    await userEvent.type(screen.getByRole('textbox', { name: '年' }), '2026');
    const button = screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' });
    // A right click: the press blurs the field, and no calendar opens.
    fireEvent.pointerDown(button, { button: 2 });
    (document.activeElement as HTMLElement).blur();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('dialog')).toBeNull();
    // Back into the fields and out again: now it checks.
    screen.getByRole('textbox', { name: '月' }).focus();
    (document.activeElement as HTMLElement).blur();
    expect(await screen.findByText('年・月・日をすべて入れてください。')).toBeInTheDocument();
  });
  it('closes only the calendar on Esc inside a dialog', async () => {
    render(
      <Dialog trigger={<Button>開く</Button>} title="予約" description="日を選びます。">
        <DatePicker label="予約の日" today="2026-11-22" />
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    await userEvent.click(screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' }));
    await screen.findByRole('grid');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('dialog', { name: '予約' })).toBeInTheDocument();
  });
});
