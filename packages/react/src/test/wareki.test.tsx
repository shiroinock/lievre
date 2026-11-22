import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar, DateField, DatePicker, DateRangePicker } from '../index';

describe('Calendar in the Japanese era', () => {
  it('heads the month and names the days in the era', () => {
    render(<Calendar calendar="japanese" today="2026-11-22" />);
    expect(screen.getByRole('grid', { name: '令和8年11月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^令和8年11月22日\(日\)$/ })).toBeVisible();
  });
  it('names each day by its own era in the month the era changed', async () => {
    render(<Calendar calendar="japanese" today="2019-04-30" autoFocus />);
    expect(screen.getByRole('grid', { name: '平成31年4月' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('grid', { name: '令和元年5月' })).toBeInTheDocument();
    expect(document.activeElement).toHaveAccessibleName(/^令和元年5月1日/);
  });
});

describe('DateField in the Japanese era', () => {
  it('adds the era under the fields once the date passes', async () => {
    render(<DateField label="生年月日" calendar="japanese" />);
    const reading = () => document.querySelector('.lv-date-field-reading');
    expect(reading()).toBeNull();
    await userEvent.type(screen.getByRole('textbox', { name: '年' }), '1989');
    await userEvent.type(screen.getByRole('textbox', { name: '月' }), '1');
    await userEvent.type(screen.getByRole('textbox', { name: '日' }), '8');
    expect(reading()).toHaveTextContent('和暦：平成元年1月8日');
    // Read with each field, not announced while typing.
    expect(reading()).not.toHaveAttribute('aria-live');
    for (const name of ['年', '月', '日'])
      expect(screen.getByRole('textbox', { name })).toHaveAccessibleDescription(
        /和暦：平成元年1月8日/,
      );
    await userEvent.clear(screen.getByRole('textbox', { name: '日' }));
    expect(reading()).toBeNull();
    expect(screen.getByRole('textbox', { name: '年' })).not.toHaveAccessibleDescription(/和暦/);
  });
  it('is the same Gregorian date in the fields and the value', () => {
    render(<DateField label="生年月日" calendar="japanese" defaultValue="2019-05-01" />);
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('2019');
    expect(screen.getByText('和暦：令和元年5月1日')).toBeInTheDocument();
  });
  it('leaves the era out unless asked', () => {
    render(<DateField label="生年月日" defaultValue="2019-05-01" />);
    expect(document.querySelector('.lv-date-field-reading')).toBeNull();
  });
});

describe('DatePicker and DateRangePicker in the Japanese era', () => {
  it('opens the calendar in the era', async () => {
    render(<DatePicker label="予約の日" calendar="japanese" today="2026-11-22" />);
    await userEvent.click(screen.getByRole('button', { name: '予約の日をカレンダーから選ぶ' }));
    expect(await screen.findByRole('grid', { name: '令和8年11月' })).toBeInTheDocument();
  });
  it('adds the era under both ends', () => {
    render(
      <DateRangePicker
        label="宿泊の期間"
        calendar="japanese"
        defaultValue={{ start: '2026-12-01', end: '2026-12-05' }}
      />,
    );
    expect(
      within(screen.getByRole('group', { name: '開始日' })).getByText('和暦：令和8年12月1日'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: '終了日' })).getByText('和暦：令和8年12月5日'),
    ).toBeInTheDocument();
  });
});
