import { cx } from './system';

export type NumberFormatOptions = {
  /** 小数の桁。決めると、その桁で丸めて0も埋めます（1.5 → 1.50）。表の列で小数点の位置をそろえるときに。 */
  fractionDigits?: number;
  /** 割合として出す（0.123 → 12.3%）。value は 1 を 100% として渡します。 */
  percent?: boolean;
  /** 0 のほかは符号を付ける（+12・-3）。前との差を示すときに。 */
  sign?: boolean;
};
/** 数を日本語の書式（桁区切り）の文字にします。FormatNumber と同じ書式を、文の中や aria-label に使うときに。 */
export function formatNumber(value: number, options: NumberFormatOptions = {}) {
  const { fractionDigits, percent = false, sign = false } = options;
  // exceptZero drops the sign of a zero, also of -0 and of a negative that rounds to zero
  // ('auto' writes them -0 and -0.00). Without sign, the plus is taken off again.
  const text = new Intl.NumberFormat('ja-JP', {
    style: percent ? 'percent' : 'decimal',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits ?? (percent ? 1 : 3),
    signDisplay: 'exceptZero',
  }).format(value);
  return sign ? text : text.replace(/^\+/, '');
}

export type DateFormatOptions = {
  /** 'date' は日付（2026年11月22日）、'datetime' は日時（2026/11/22 9:05）、'time' は時刻（9:05）。 */
  style?: 'date' | 'datetime' | 'time';
  /** 'japanese' で和暦（令和8年11月22日）。年号の切り替わりの日も正しく出ます（令和元年5月1日）。日付だけに効きます。 */
  calendar?: 'gregory' | 'japanese';
  /** 曜日を添える（2026年11月22日(日)）。style="date" のときだけ。 */
  weekday?: boolean;
  /** 表示に使う時間帯（'Asia/Tokyo' など）。省くと見ている端末の時間帯です。サーバーとブラウザで同じ文字にしたいときに決めます。'YYYY-MM-DD' の文字は日付そのものなので、時間帯によらず同じ日に出します。 */
  timeZone?: string;
};
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Midnight UTC of a written day. Not Date.UTC, which reads the years 0 to 99 as 1900 to 1999. */
function utcDay(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second);
  return date;
}
/** An ISO 8601 date-time: other text is read differently by each engine (V8 reads '12' as
 * 2001-12-01), so it is not read as a date at all. The zone (Z, +09:00 or +0900) may be left out,
 * and the seconds may carry any number of decimals. */
const ISO_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/;
/** The same date-time in the form every engine reads: milliseconds at most and +09:00 with a colon. */
function plainIso(match: RegExpExecArray) {
  const [, head, fraction, zone] = match;
  const ms = fraction ? `.${fraction.slice(0, 3).padEnd(3, '0')}` : '';
  const offset =
    zone && zone !== 'Z' && !zone.includes(':') ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone;
  return `${head}${ms}${offset ?? 'Z'}`;
}
/** How far a time zone's clock runs ahead of UTC at a moment, in milliseconds. */
function offsetAt(moment: Date, timeZone: string | undefined) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(moment)
      .map((part) => [part.type, Number(part.value)]),
  );
  const seen = utcDay(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  return seen.getTime() - Math.floor(moment.getTime() / 1000) * 1000;
}
/** The moment a wall-clock time (held as if it were UTC) names in a time zone. The offset is
 * measured again at the moment found, since near a daylight-saving change the offset at the
 * wall-clock reading taken as UTC can be the other one. */
function inZone(wall: Date, timeZone: string | undefined) {
  const guess = wall.getTime() - offsetAt(wall, timeZone);
  return new Date(wall.getTime() - offsetAt(new Date(guess), timeZone));
}
const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})/;
/** Whether the year, month and day written at the head of the text exist on the calendar:
 * Date.UTC (and V8's own parsing) roll 2026-02-30 over to March and 2026-13-01 into the next year. */
function writtenDayExists(text: string) {
  const head = DATE_HEAD.exec(text);
  if (!head) return true;
  const [year, month, day] = head.slice(1).map(Number);
  const date = utcDay(year, month, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  );
}
/** A moment from the value, or null when it is not a date. 'YYYY-MM-DD' and a date-time without
 * a zone ('2026-11-22T09:05') are wall-clock values: they are held as if in UTC and always
 * written in UTC, so they read as written in every time zone, on the server as in the browser. */
function read(value: Date | string) {
  const day = typeof value === 'string' ? DATE_ONLY.exec(value) : null;
  const iso = typeof value === 'string' ? ISO_DATE_TIME.exec(value) : null;
  const floating = !!iso && !iso[3];
  const date =
    value instanceof Date
      ? value
      : day
        ? utcDay(Number(day[1]), Number(day[2]), Number(day[3]))
        : iso
          ? new Date(plainIso(iso))
          : new Date(NaN);
  if (Number.isNaN(date.getTime())) return null;
  // A day that does not exist is not a date, in a date-time as in a bare date.
  if (typeof value === 'string' && !writtenDayExists(value)) return null;
  return { date, dayOnly: !!day, floating };
}
/** 日付・日時を日本語の書式の文字にします。FormatDate と同じ書式を、文の中に使うときに。'YYYY-MM-DD' と ISO 8601 の日時（'2026-11-22T09:05:00+09:00'）のほかの文字は、日付として読まずにそのまま返します。時間帯のない日時（'2026-11-22T09:05'）は、書いた時刻のまま出します。 */
export function formatDate(value: Date | string, options: DateFormatOptions = {}) {
  const { style = 'date', calendar = 'gregory', weekday = false } = options;
  const moment = read(value);
  if (!moment) return value instanceof Date ? '' : value;
  const { date, dayOnly, floating } = moment;
  const timeZone = dayOnly || floating ? 'UTC' : options.timeZone;
  if (style === 'time')
    return new Intl.DateTimeFormat('ja-JP', { timeStyle: 'short', timeZone }).format(date);
  if (style === 'datetime')
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  return new Intl.DateTimeFormat(calendar === 'japanese' ? 'ja-JP-u-ca-japanese' : 'ja-JP', {
    ...(calendar === 'japanese' ? { era: 'long' as const } : {}),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: weekday ? 'short' : undefined,
    timeZone,
  }).format(date);
}
/** The machine-readable value for <time datetime>, in the same time zone as the text; none when
 * the value is not a date. */
function machineValue(value: Date | string, options: DateFormatOptions, exact: boolean) {
  const moment = read(value);
  if (!moment) return undefined;
  if (typeof value === 'string') return value;
  // A relative time keeps the exact moment, whatever the style.
  if (exact || (options.style ?? 'date') !== 'date') return value.toISOString();
  // en-CA writes YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

const DAY = 24 * 3600 * 1000;
/** Days since the epoch of the calendar day a moment falls on: in UTC for a 'YYYY-MM-DD' day,
 * in the viewer's time zone otherwise. */
function dayNumber(date: Date, timeZone: string | undefined) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);
  return utcDay(year, month, day).getTime() / DAY;
}
/**
 * 今との差を言葉にします（3分前・昨日・2日後）。1日より近い時刻は時間・分・秒で、それより離れた日は暦の日の差（昨日・一昨日・3日前）で、
 * 1週より離れると週・月・年で丸めて言います。'YYYY-MM-DD' の文字は日付なので、今日・昨日・明日のように日の差だけで言います。
 */
export function formatRelativeTime(
  value: Date | string,
  options: {
    /** 基準の「今」。省くと呼んだ時の時刻です。 */
    now?: Date;
    /** 暦の日（今日・昨日）を数える時間帯。省くと端末の時間帯です。サーバーとブラウザで同じ文字にしたいときに決めます。 */
    timeZone?: string;
  } = {},
) {
  const { now = new Date(), timeZone } = options;
  const moment = read(value);
  if (!moment) return value instanceof Date ? '' : value;
  const words = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });
  // A wall-clock time without a zone is that time in the given time zone.
  const date = moment.floating ? inZone(moment.date, timeZone) : moment.date;
  const ms = date.getTime() - now.getTime();
  if (!moment.dayOnly && Math.abs(ms) < DAY) {
    const seconds = ms / 1000;
    if (Math.abs(seconds) >= 3600) return words.format(Math.round(seconds / 3600), 'hour');
    if (Math.abs(seconds) >= 60) return words.format(Math.round(seconds / 60), 'minute');
    return words.format(Math.round(seconds), 'second');
  }
  // Calendar days, not elapsed hours: 39 hours ago late at night is still yesterday.
  const days = dayNumber(date, moment.dayOnly ? 'UTC' : timeZone) - dayNumber(now, timeZone);
  if (Math.abs(days) < 7) return words.format(days, 'day');
  // Weeks, months and years are rounded counts, so say the count (「1 か月前」), never a
  // calendar word (「先月」) that may name the wrong month.
  const counted = new Intl.RelativeTimeFormat('ja', { numeric: 'always' });
  if (Math.abs(days) < 30) return counted.format(Math.round(days / 7), 'week');
  if (Math.abs(days) < 365) return counted.format(Math.round(days / 30), 'month');
  return counted.format(Math.round(days / 365), 'year');
}

/**
 * 数を、桁をそろえた書式で出します（桁区切り・小数の桁・割合・符号）。
 * 数字は等幅（Lievre Mono）で、単位（円・件）は数字の後ろに本文の書体で添えます。表の列では右揃えの列に置くと、桁と小数点の位置がそろいます。
 */
export function FormatNumber({
  value,
  unit,
  mono = true,
  className,
  ...options
}: NumberFormatOptions & {
  /** 出す数。割合（percent）では 1 を 100% として渡します。 */
  value: number;
  /** 数字の後ろに添える単位（「円」「件」）。割合は percent を使い、ここに「%」を書きません。 */
  unit?: string;
  /** 等幅の書体にする。false では本文の書体のまま数字の幅だけをそろえます（文の中の数字）。 */
  mono?: boolean;
  className?: string;
}) {
  // Units are words, not data: the percent sign and the unit sit outside the mono figures.
  const text = formatNumber(value, options);
  const figures = options.percent ? text.replace('%', '') : text;
  const after = [options.percent ? '%' : '', unit ?? ''].join('');
  return (
    <span className={cx('lv-format', className)}>
      <span className={mono ? 'lv-mono' : 'lv-tabular'}>{figures}</span>
      {after && <span className="lv-format-unit">{after}</span>}
    </span>
  );
}

/**
 * 日付・日時を、日本語の書式で <time datetime> に出します。和暦（calendar="japanese"）にも、今との差（relative）にもできます。
 * 'YYYY-MM-DD' の文字は、その日として扱い、時間帯でずらしません。日付として読めない値は、その文字のまま出します（datetime は付けません）。
 */
export function FormatDate({
  value,
  relative = false,
  now,
  mono = false,
  className,
  ...options
}: DateFormatOptions & {
  /** Date か、ISO 8601 の文字（'2026-11-22'・'2026-11-22T09:05:00+09:00'）。 */
  value: Date | string;
  /** 今との差で出す（3分前・昨日）。正確な日時は datetime の属性に残ります。暦の日は timeZone で数えます。 */
  relative?: boolean;
  /** relative の基準の「今」。省くと描いた時の時刻です。 */
  now?: Date;
  /** 等幅の書体にする（表の日付の列で桁をそろえるとき）。false では本文の書体のまま、数字の幅だけをそろえます。 */
  mono?: boolean;
  className?: string;
}) {
  return (
    <time
      dateTime={machineValue(value, options, relative)}
      className={cx('lv-format', mono ? 'lv-mono' : 'lv-tabular', className)}
    >
      {relative
        ? formatRelativeTime(value, { now, timeZone: options.timeZone })
        : formatDate(value, options)}
    </time>
  );
}
