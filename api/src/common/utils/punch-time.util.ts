import { WeekDay } from '@prisma/client';
import { formatTimeOnly } from './time.util';

const JS_DAY_TO_WEEKDAY: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

export function toWeekDay(value: Date): WeekDay {
  // Les dates métier (@db.Date) sont stockées à minuit UTC : utiliser getUTCDay
  // pour rester aligné avec le planning. Pour un horodatage « maintenant »,
  // préférer le jour local.
  const isUtcMidnight =
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0;
  const dayIndex = isUtcMidnight ? value.getUTCDay() : value.getDay();
  return JS_DAY_TO_WEEKDAY[dayIndex];
}

export function parseHHmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function timeDateToMinutes(value: Date | null | undefined): number | null {
  if (!value) return null;
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

export function dateToMinutes(value: Date): number {
  return value.getHours() * 60 + value.getMinutes();
}

function parseTimeZoneOffsetMinutes(value: string): number {
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}

export function getTimeZoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const offset = parts.find((part) => part.type === 'timeZoneName')?.value;
  return offset ? parseTimeZoneOffsetMinutes(offset) : 0;
}

export function dateToMinutesInTimeZone(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export function dateKeyInTimeZone(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export const DEFAULT_ORG_TIMEZONE = 'Africa/Brazzaville';

export function resolveOrgTimeZone(timeZone: string | null | undefined): string {
  const trimmed = timeZone?.trim();
  return trimmed || DEFAULT_ORG_TIMEZONE;
}

export function dateKeyAddDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayBoundsForDateKeyInTimeZone(
  dateKey: string,
  timeZone: string,
): { start: Date; end: Date } {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const startUtcAnchor = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endUtcAnchor = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  const startOffset = getTimeZoneOffsetMinutes(startUtcAnchor, timeZone);
  const endOffset = getTimeZoneOffsetMinutes(endUtcAnchor, timeZone);

  const start = new Date(startUtcAnchor.getTime() - startOffset * 60_000);
  const end = new Date(endUtcAnchor.getTime() - endOffset * 60_000 - 1);
  return { start, end };
}

export function resolveShiftBounds(
  startTime: Date | null | undefined,
  endTime: Date | null | undefined,
  weekDayStart?: string | null,
  weekDayEnd?: string | null,
): { startMin: number; endMin: number } {
  const startMin = weekDayStart
    ? parseHHmmToMinutes(weekDayStart)
    : (timeDateToMinutes(startTime) ?? 8 * 60);
  const endMin = weekDayEnd
    ? parseHHmmToMinutes(weekDayEnd)
    : (timeDateToMinutes(endTime) ?? 17 * 60);
  return { startMin, endMin };
}

/** True when the shift crosses midnight (end clock time ≤ start). */
export function isOvernightShift(startMin: number, endMin: number): boolean {
  return endMin <= startMin;
}

export function shiftDurationMinutes(startMin: number, endMin: number): number {
  if (endMin > startMin) return endMin - startMin;
  return endMin + 24 * 60 - startMin;
}

/** Minutes elapsed since `originMin` on a 24h circular clock (0..1439). */
export function minutesSinceOrigin(atMin: number, originMin: number): number {
  return (atMin - originMin + 24 * 60) % (24 * 60);
}

/** Inclusive wrap-aware interval (same semantics as punch `inWindow`). */
export function inMinuteWindow(min: number, start: number, end: number): boolean {
  if (end >= start) {
    return min >= start && min <= end;
  }
  return min >= start || min <= end;
}

/**
 * "Too early" for a (possibly wrapping) window: in the exterior gap and closer to
 * the upcoming start than to the just-passed end.
 */
export function beforeMinuteWindowStart(min: number, start: number, end: number): boolean {
  if (end >= start) return min < start;
  if (!(min > end && min < start)) return false;
  return start - min <= min - end;
}

/** "Too late" for a (possibly wrapping) window — exterior gap closer to end. */
export function afterMinuteWindowEnd(min: number, start: number, end: number): boolean {
  if (end >= start) return min > end;
  if (!(min > end && min < start)) return false;
  return min - end < start - min;
}

export function formatShiftTime(value: Date | null | undefined): string {
  return formatTimeOnly(value) || '08:00';
}
