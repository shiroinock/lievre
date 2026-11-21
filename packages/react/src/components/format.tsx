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
  return new Intl.NumberFormat('ja-JP', {
    style: percent ? 'percent' : 'decimal',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits ?? (percent ? 1 : 3),
    signDisplay: sign ? 'exceptZero' : 'auto',
  }).format(value);
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
/** A moment from the value, or null when it is not a date. 'YYYY-MM-DD' becomes midnight UTC
 * and is always written in UTC: it names a calendar day, not a moment, so no time zone moves it. */
function read(value: Date | string) {
  const day = typeof value === 'string' ? DATE_ONLY.exec(value) : null;
  const date =
    value instanceof Date
      ? value
      : day
        ? new Date(Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3])))
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, dayOnly: !!day };
}
/** 日付・日時を日本語の書式の文字にします。FormatDate と同じ書式を、文の中に使うときに。日付として読めない文字は、そのまま返します。 */
export function formatDate(value: Date | string, options: DateFormatOptions = {}) {
  const { style = 'date', calendar = 'gregory', weekday = false } = options;
  const moment = read(value);
  if (!moment) return value instanceof Date ? '' : value;
  const { date, dayOnly } = moment;
  const timeZone = dayOnly ? 'UTC' : options.timeZone;
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
function machineValue(value: Date | string, options: DateFormatOptions) {
  const moment = read(value);
  if (!moment) return undefined;
  if (typeof value === 'string') return value;
  if ((options.style ?? 'date') !== 'date') return value.toISOString();
  // en-CA writes YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];
/** 今との差を言葉にします（3分前・昨日・2日後）。差のいちばん大きい単位で丸めます。 */
export function formatRelativeTime(value: Date | string, now: Date = new Date()) {
  const moment = read(value);
  if (!moment) return value instanceof Date ? '' : value;
  const seconds = (moment.date.getTime() - now.getTime()) / 1000;
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[UNITS.length - 1];
  return new Intl.RelativeTimeFormat('ja', { numeric: 'auto' }).format(
    Math.round(seconds / size),
    unit,
  );
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
  return (
    <span className={cx('lv-format', mono ? 'lv-mono' : 'lv-tabular', className)}>
      {formatNumber(value, options)}
      {unit && <span className="lv-format-unit">{unit}</span>}
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
  /** 今との差で出す（3分前・昨日）。正確な日時は datetime の属性に残ります。 */
  relative?: boolean;
  /** relative の基準の「今」。省くと描いた時の時刻です。 */
  now?: Date;
  /** 等幅の書体にする（表の日付の列で桁をそろえるとき）。false では本文の書体のまま、数字の幅だけをそろえます。 */
  mono?: boolean;
  className?: string;
}) {
  return (
    <time
      dateTime={machineValue(value, options)}
      className={cx('lv-format', mono ? 'lv-mono' : 'lv-tabular', className)}
    >
      {relative ? formatRelativeTime(value, now) : formatDate(value, options)}
    </time>
  );
}
