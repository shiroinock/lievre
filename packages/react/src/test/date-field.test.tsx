import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateField, checkDate, dateCheckMessage } from '../index';

const box = (name: string) => screen.getByRole('textbox', { name });

describe('checkDate', () => {
  it('turns parts into an ISO date, taking full-width digits', () => {
    expect(checkDate({ year: '２０２６', month: '１１', day: '２２' })).toEqual({
      kind: 'ok',
      value: '2026-11-22',
    });
    expect(checkDate({ year: '2024', month: '2', day: '29' })).toEqual({
      kind: 'ok',
      value: '2024-02-29',
    });
  });
  it('tells empty, partial, not a number and no such day apart', () => {
    expect(checkDate({ year: '', month: '', day: '' }).kind).toBe('empty');
    expect(checkDate({ year: '2026', month: '', day: '1' }).kind).toBe('partial');
    expect(checkDate({ year: '26', month: '1', day: '1' }).kind).toBe('not-number');
    expect(checkDate({ year: '2026', month: 'a', day: '1' }).kind).toBe('not-number');
    expect(checkDate({ year: '2026', month: '2', day: '29' }).kind).toBe('no-such-day');
    expect(checkDate({ year: '2026', month: '13', day: '1' }).kind).toBe('no-such-day');
    expect(checkDate({ year: '2026', month: '1', day: '0' }).kind).toBe('no-such-day');
  });
  it('holds the range', () => {
    const range = { min: '2026-01-01', max: '2026-12-31' };
    expect(checkDate({ year: '2025', month: '12', day: '31' }, range).kind).toBe('before-min');
    expect(checkDate({ year: '2027', month: '1', day: '1' }, range).kind).toBe('after-max');
    expect(checkDate({ year: '2026', month: '1', day: '1' }, range).kind).toBe('ok');
  });
  it('words each reason with how to fix it', () => {
    expect(dateCheckMessage({ kind: 'no-such-day', year: 2026, month: 2, day: 30 })).toBe(
      '2026年2月30日はありません。日付を確かめてください。',
    );
    expect(dateCheckMessage({ kind: 'after-max', max: '2026-12-31' })).toBe(
      '2026年12月31日以前の日付を入れてください。',
    );
    expect(dateCheckMessage({ kind: 'ok', value: '2026-01-01' })).toBeUndefined();
  });
});

describe('DateField', () => {
  it('groups the three fields under the label', () => {
    render(<DateField label="生年月日" hint="例：1990 4 1" />);
    const group = screen.getByRole('group', { name: '生年月日' });
    expect(group).toHaveAccessibleDescription('例：1990 4 1');
    for (const name of ['年', '月', '日'])
      expect(box(name)).toHaveAttribute('inputmode', 'numeric');
  });
  it('reports the date once it is whole and valid, and null when it no longer is', async () => {
    const onValueChange = vi.fn();
    render(<DateField label="生年月日" onValueChange={onValueChange} />);
    await userEvent.type(box('年'), '1990');
    await userEvent.type(box('月'), '4');
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.type(box('日'), '1');
    expect(onValueChange).toHaveBeenLastCalledWith('1990-04-01');
    await userEvent.type(box('日'), '0');
    expect(onValueChange).toHaveBeenLastCalledWith('1990-04-10');
    await userEvent.clear(box('月'));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });
  it('checks only when the focus leaves the group', async () => {
    render(<DateField label="生年月日" />);
    await userEvent.type(box('年'), '2026');
    await userEvent.tab();
    expect(screen.queryByText('年・月・日をすべて入れてください。')).toBeNull();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByText('年・月・日をすべて入れてください。')).toBeInTheDocument();
    for (const name of ['年', '月', '日'])
      expect(box(name)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('group', { name: '生年月日' })).toHaveAccessibleDescription(
      /すべて入れてください/,
    );
  });
  it('straightens full-width digits when leaving a field', async () => {
    render(<DateField label="生年月日" />);
    await userEvent.type(box('年'), '１９９０');
    await userEvent.tab();
    expect(box('年')).toHaveValue('1990');
  });
  it('shows the given error instead of its own', async () => {
    render(<DateField label="生年月日" error="生年月日を入れてください。" />);
    expect(screen.getByText('生年月日を入れてください。')).toBeInTheDocument();
  });
  it('follows a controlled value and keeps partial typing', async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>('2026-11-22');
      return (
        <>
          <DateField label="届け出の日" value={value} onValueChange={setValue} />
          <button onClick={() => setValue('2000-01-02')}>変える</button>
          <output>{value ?? 'なし'}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(box('日')).toHaveValue('22');
    await userEvent.clear(box('日'));
    expect(screen.getByRole('status')).toHaveTextContent('なし');
    expect(box('月')).toHaveValue('11');
    await userEvent.click(screen.getByRole('button', { name: '変える' }));
    expect([box('年'), box('月'), box('日')].map((b) => (b as HTMLInputElement).value)).toEqual([
      '2000',
      '1',
      '2',
    ]);
  });
  it('marks the fields required and sends the date with name', () => {
    const { container } = render(
      <DateField label="生年月日" required name="birthday" defaultValue="1990-04-01" />,
    );
    expect(box('年')).toHaveAttribute('aria-required', 'true');
    expect(container.querySelector('input[type="hidden"]')).toHaveAttribute('value', '1990-04-01');
  });
  it('asks the browser for birthday parts', () => {
    render(<DateField label="生年月日" autoComplete="bday" />);
    expect(box('年')).toHaveAttribute('autocomplete', 'bday-year');
    expect(box('日')).toHaveAttribute('autocomplete', 'bday-day');
  });
});
