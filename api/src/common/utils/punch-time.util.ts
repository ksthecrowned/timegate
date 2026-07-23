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

export function formatShiftTime(value: Date | null | undefined): string {
  return formatTimeOnly(value) || '08:00';
}
