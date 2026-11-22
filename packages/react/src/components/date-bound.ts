// Shared by DateField and Calendar; not exported from the package.
import { parseDate, type CalendarDate } from '@internationalized/date';

/** A bound from 'YYYY-MM-DD' or the date part of an ISO date-time; anything else is ignored. */
export function readBound(text: string | null | undefined): CalendarDate | undefined {
  const day = text && /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0];
  if (!day) return undefined;
  try {
    return parseDate(day);
  } catch {
    return undefined;
  }
}
