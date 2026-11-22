import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  FormatDate,
  FormatNumber,
  TextField,
  formatDate,
  formatNumber,
  formatRelativeTime,
  toFullWidthKana,
  toHalfWidth,
  toSearchKey,
} from '../index';

describe('toHalfWidth', () => {
  it('turns full-width digits, latin, symbols and space into half-width', () => {
    expect(toHalfWidth('０１２３ ＡＢｃ　＠＃（）')).toBe('0123 ABc @#()');
  });
  it('leaves half-width katakana and enclosed characters alone, unlike NFKC', () => {
    expect(toHalfWidth('ｶﾞﾝﾀﾞﾑ①㈱')).toBe('ｶﾞﾝﾀﾞﾑ①㈱');
  });
  it('picks what it straightens', () => {
    expect(toHalfWidth('Ａ１！', { latin: false })).toBe('Ａ1!');
    expect(toHalfWidth('Ａ１！', { digits: false, symbols: false })).toBe('A１！');
    expect(toHalfWidth('　', { space: false })).toBe('　');
  });
  it('folds dashes only when asked, so a long vowel stays in words', () => {
    expect(toHalfWidth('０９０ー１２３４－５６７８')).toBe('090ー1234-5678');
    expect(toHalfWidth('０９０ー１２３４‐５６７８−', { dashes: true })).toBe('090-1234-5678-');
  });
});

describe('toFullWidthKana', () => {
  it('joins voiced marks and leaves other characters', () => {
    expect(toFullWidthKana('ｶﾞﾝﾀﾞﾑ ﾊﾟﾝ ABC１')).toBe('ガンダム パン ABC１');
  });
});

describe('toSearchKey', () => {
  it('ignores width, kana, case and spaces', () => {
    expect(toSearchKey('トウキョウ ＡＢＣ')).toBe(toSearchKey('とうきょうabc'));
    expect(toSearchKey('ｶﾌﾞｼｷｶﾞｲｼｬ')).toBe('かぶしきがいしゃ');
  });
});

describe('formatNumber', () => {
  it('groups digits and fixes fraction digits', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,567.891');
    expect(formatNumber(1.5, { fractionDigits: 2 })).toBe('1.50');
  });
  it('shows percent and sign', () => {
    expect(formatNumber(0.1234, { percent: true })).toBe('12.3%');
    expect(formatNumber(12, { sign: true })).toBe('+12');
    expect(formatNumber(0, { sign: true })).toBe('0');
  });
  it('never writes a minus on zero', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.001, { fractionDigits: 2 })).toBe('0.00');
    expect(formatNumber(-0.0001, { percent: true })).toBe('0%');
    expect(formatNumber(-0.001, { fractionDigits: 2, sign: true })).toBe('0.00');
    expect(formatNumber(-3)).toBe('-3');
  });
});

describe('formatDate', () => {
  it('reads YYYY-MM-DD as that day, not midnight UTC', () => {
    expect(formatDate('2026-11-22')).toBe('2026年11月22日');
    expect(formatDate('2026-11-22', { weekday: true })).toBe('2026年11月22日(日)');
  });
  it('shows the Japanese era across its change', () => {
    expect(formatDate('2019-04-30', { calendar: 'japanese' })).toBe('平成31年4月30日');
    expect(formatDate('2019-05-01', { calendar: 'japanese' })).toBe('令和元年5月1日');
  });
  it('shows date and time in a given time zone', () => {
    const at = '2026-11-22T00:05:00Z';
    expect(formatDate(at, { style: 'datetime', timeZone: 'Asia/Tokyo' })).toBe('2026/11/22 9:05');
    expect(formatDate(at, { style: 'time', timeZone: 'Asia/Tokyo' })).toBe('9:05');
  });
  it('keeps a YYYY-MM-DD day in any time zone', () => {
    for (const timeZone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Tokyo'])
      expect(formatDate('2026-11-22', { timeZone })).toBe('2026年11月22日');
  });
  it('returns text it cannot read as a date, instead of throwing', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('2026/13/40')).toBe('2026/13/40');
    expect(formatDate(new Date(NaN))).toBe('');
    expect(formatRelativeTime('いつか')).toBe('いつか');
  });
  it('rejects a day that does not exist instead of rolling it over', () => {
    expect(formatDate('2026-02-30')).toBe('2026-02-30');
    expect(formatDate('2026-13-01')).toBe('2026-13-01');
    expect(formatDate('2026-00-10')).toBe('2026-00-10');
    expect(formatDate('2026-02-30T10:00:00+09:00', { style: 'datetime' })).toBe(
      '2026-02-30T10:00:00+09:00',
    );
    expect(formatDate('2024-02-29T10:00:00+09:00', { timeZone: 'Asia/Tokyo' })).toBe(
      '2024年2月29日',
    );
  });
  it('keeps the years 0 to 99 as written', () => {
    expect(formatDate('0050-03-01')).toBe('50年3月1日');
    expect(formatDate('0099-12-31')).not.toMatch(/1999/);
    expect(formatRelativeTime('0050-03-01', { now: new Date(2026, 10, 22) })).toMatch(
      /^1,97\d 年前$/,
    );
  });
  it('reads only ISO 8601, not what one engine happens to read', () => {
    expect(formatDate('12')).toBe('12');
    expect(formatDate('2026/11/22')).toBe('2026/11/22');
    expect(formatDate('2026-11-22T09:05', { style: 'time' })).toBe('9:05');
  });
  it('writes a date-time without a zone as written, whatever the time zone', () => {
    for (const timeZone of ['Asia/Tokyo', 'America/New_York', 'UTC'])
      expect(formatDate('2026-11-22T09:05', { style: 'datetime', timeZone })).toBe(
        '2026/11/22 9:05',
      );
    // Counted as that time in the given zone.
    const now = new Date('2026-11-22T00:08:00Z');
    expect(formatRelativeTime('2026-11-22T09:05', { now, timeZone: 'Asia/Tokyo' })).toBe('3 分前');
    expect(formatRelativeTime('2026-11-21T19:05', { now, timeZone: 'America/New_York' })).toBe(
      '3 分前',
    );
  });
  it('counts a time without a zone right just after a daylight-saving change', () => {
    // New York leaves daylight saving at 06:00 UTC on 2026-11-01; 03:00 there is 08:00 UTC.
    const timeZone = 'America/New_York';
    expect(
      formatRelativeTime('2026-11-01T03:00', { now: new Date('2026-11-01T08:03:00Z'), timeZone }),
    ).toBe('3 分前');
    // And enters it at 07:00 UTC on 2026-03-08; 04:00 there is 08:00 UTC.
    expect(
      formatRelativeTime('2026-03-08T04:00', { now: new Date('2026-03-08T08:03:00Z'), timeZone }),
    ).toBe('3 分前');
  });
  it('reads microseconds and a zone without a colon', () => {
    const style = 'datetime';
    expect(formatDate('2026-11-22T09:05:00.123456+09:00', { style, timeZone: 'Asia/Tokyo' })).toBe(
      '2026/11/22 9:05',
    );
    expect(formatDate('2026-11-22T09:05:00+0900', { style, timeZone: 'Asia/Tokyo' })).toBe(
      '2026/11/22 9:05',
    );
    expect(formatDate('2026-11-22T00:05:00.5Z', { style, timeZone: 'UTC' })).toBe(
      '2026/11/22 0:05',
    );
  });
  it('counts weeks, months and years without calendar words that could be wrong', () => {
    const now = new Date(2027, 0, 1, 12);
    expect(formatRelativeTime(new Date(2025, 6, 5, 12), { now })).toBe('1 年前');
    expect(formatRelativeTime(new Date(2026, 8, 18, 12), { now: new Date(2026, 10, 1, 12) })).toBe(
      '1 か月前',
    );
    expect(
      formatRelativeTime(new Date(2026, 10, 10, 12), { now: new Date(2026, 10, 22, 12) }),
    ).toBe('2 週間前');
  });
  it('counts calendar days in the given time zone', () => {
    // 15:30 UTC on the 21st is already the 22nd in Tokyo and still the 21st in Los Angeles.
    const now = new Date('2026-11-22T03:00:00Z');
    const at = new Date('2026-11-21T15:30:00Z');
    expect(
      formatRelativeTime(new Date('2026-11-20T15:30:00Z'), { now, timeZone: 'Asia/Tokyo' }),
    ).toBe('昨日');
    expect(
      formatRelativeTime(new Date('2026-11-20T22:00:00Z'), {
        now,
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('昨日');
    expect(at.getTime()).toBeLessThan(now.getTime());
  });
  it('says today, yesterday and tomorrow for a YYYY-MM-DD day by calendar days', () => {
    const now = new Date(2026, 10, 22, 23, 30);
    expect(formatRelativeTime('2026-11-22', { now })).toBe('今日');
    expect(formatRelativeTime('2026-11-21', { now })).toBe('昨日');
    expect(formatRelativeTime('2026-11-23', { now })).toBe('明日');
  });
  it('picks yesterday by the calendar, not by hours divided by 24', () => {
    const now = new Date(2026, 10, 22, 23, 0);
    // 39 hours before is 08:00 on the 21st: yesterday, not the day before.
    expect(formatRelativeTime(new Date(2026, 10, 21, 8, 0), { now })).toBe('昨日');
    expect(formatRelativeTime(new Date(2026, 10, 20, 1, 0), { now })).toBe('一昨日');
  });
  it('says the difference from now', () => {
    const now = new Date('2026-11-22T10:00:00+09:00');
    expect(formatRelativeTime('2026-11-21T10:00:00+09:00', { now })).toBe('昨日');
    expect(formatRelativeTime('2026-11-22T09:57:00+09:00', { now })).toBe('3 分前');
    expect(formatRelativeTime('2026-11-24T10:00:00+09:00', { now })).toBe('明後日');
  });
});

describe('FormatNumber and FormatDate', () => {
  it('draws mono figures with the unit outside them', () => {
    const { container } = render(<FormatNumber value={128000} unit="円" />);
    const out = container.querySelector('.lv-format')!;
    expect(out).toHaveTextContent('128,000円');
    expect(out.querySelector('.lv-mono')).toHaveTextContent(/^128,000$/);
    expect(out.querySelector('.lv-format-unit')).toHaveTextContent('円');
  });
  it('keeps the percent sign outside the mono figures', () => {
    const { container } = render(<FormatNumber value={0.123} percent />);
    expect(container.querySelector('.lv-mono')).toHaveTextContent(/^12\.3$/);
    expect(container.querySelector('.lv-format-unit')).toHaveTextContent('%');
  });
  it('uses tabular figures in the body face without mono', () => {
    const { container } = render(<FormatNumber value={3} mono={false} />);
    expect(container.querySelector('.lv-tabular')).toHaveTextContent('3');
    expect(container.querySelector('.lv-mono')).toBeNull();
  });
  it('puts the machine value on <time>', () => {
    render(<FormatDate value="2019-05-01" calendar="japanese" />);
    expect(screen.getByText('令和元年5月1日')).toHaveAttribute('datetime', '2019-05-01');
  });
  it('writes the datetime day in the same time zone as the text', () => {
    render(<FormatDate value={new Date('2026-11-21T20:00:00Z')} timeZone="Asia/Tokyo" />);
    expect(screen.getByText('2026年11月22日')).toHaveAttribute('datetime', '2026-11-22');
  });
  it('leaves out datetime for a value it cannot read', () => {
    render(<FormatDate value="未定" />);
    expect(screen.getByText('未定')).not.toHaveAttribute('datetime');
  });
  it('keeps the exact moment when relative', () => {
    render(
      <FormatDate
        value="2026-11-21T10:00:00+09:00"
        relative
        now={new Date('2026-11-22T10:00:00+09:00')}
      />,
    );
    expect(screen.getByText('昨日')).toHaveAttribute('datetime', '2026-11-21T10:00:00+09:00');
  });
  it('keeps the exact moment of a Date when relative', () => {
    render(
      <FormatDate
        value={new Date('2026-11-21T01:00:00Z')}
        relative
        now={new Date('2026-11-22T01:00:00Z')}
        timeZone="Asia/Tokyo"
      />,
    );
    expect(screen.getByText('昨日')).toHaveAttribute('datetime', '2026-11-21T01:00:00.000Z');
  });
});

describe('TextField halfWidth', () => {
  it('straightens an uncontrolled value on blur, not while typing', async () => {
    render(<TextField label="郵便番号" halfWidth={{ dashes: true }} />);
    const input = screen.getByRole('textbox', { name: '郵便番号' });
    await userEvent.type(input, '１２３ー４５６７');
    expect(input).toHaveValue('１２３ー４５６７');
    await userEvent.tab();
    expect(input).toHaveValue('123-4567');
  });
  it('leaves a read-only field as it is', async () => {
    const onChange = vi.fn();
    render(<TextField label="番号" halfWidth readOnly defaultValue="０９０" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: '番号' });
    input.focus();
    await userEvent.tab();
    expect(input).toHaveValue('０９０');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('lets a controlled onBlur read the straightened state', async () => {
    const seen: string[] = [];
    function Checked() {
      const [value, setValue] = useState('');
      return (
        <TextField
          label="番号"
          halfWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => seen.push(value)}
        />
      );
    }
    render(<Checked />);
    await userEvent.type(screen.getByRole('textbox', { name: '番号' }), '１２３');
    await userEvent.tab();
    expect(seen).toEqual(['123']);
  });
  it('reports the straightened value to a controlled field and still calls onBlur', async () => {
    const onBlur = vi.fn();
    function Controlled() {
      const [value, setValue] = useState('');
      return (
        <TextField
          label="金額"
          halfWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: '金額' });
    await userEvent.type(input, '１２，０００');
    fireEvent.blur(input);
    expect(input).toHaveValue('12,000');
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
