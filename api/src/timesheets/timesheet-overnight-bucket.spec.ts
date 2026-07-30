import { describe, expect, test } from 'bun:test';
import {
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  resolvePunchWorkDateKey,
  shiftDurationMinutes,
} from '../common/utils/punch-time.util';
import type { ResolvedPunchWindows } from '../attendance/punch-window.types';

/**
 * Mirrors timesheet recalculate bucketing: evening CHECK_IN + morning CHECK_OUT
 * must share one punch work-date key.
 */
describe('timesheet overnight work-date bucketing', () => {
  const tz = 'Africa/Brazzaville';
  const overnightWindows: ResolvedPunchWindows = {
    shiftTypeId: 'NIGHT',
    allowCheckInAfterBreakStart: true,
    shiftStartMin: 22 * 60,
    shiftEndMin: 6 * 60,
    checkInStartMin: 21 * 60,
    checkInEndMin: 0,
    checkOutStartMin: 6 * 60,
    checkOutEndMin: 8 * 60,
    breakStartMin: null,
    breakEndMin: null,
    breakDurationMinutes: 60,
  };

  test('check-in evening and check-out morning share work date', () => {
    // 2026-07-29 22:15 Brazzaville = UTC+1 → 21:15Z
    const checkInAt = new Date('2026-07-29T21:15:00.000Z');
    // 2026-07-30 06:30 Brazzaville → 05:30Z
    const checkOutAt = new Date('2026-07-30T05:30:00.000Z');

    const inKey = resolvePunchWorkDateKey(
      dateKeyInTimeZone(checkInAt, tz),
      dateToMinutesInTimeZone(checkInAt, tz),
      overnightWindows,
    );
    const outKey = resolvePunchWorkDateKey(
      dateKeyInTimeZone(checkOutAt, tz),
      dateToMinutesInTimeZone(checkOutAt, tz),
      overnightWindows,
    );

    expect(inKey).toBe('2026-07-29');
    expect(outKey).toBe('2026-07-29');
    expect(inKey).toBe(outKey);
  });

  test('recalc fetch start uses org-local midnight not UTC', () => {
    const fromKey = '2026-07-21';
    const utcMidnight = new Date(`${fromKey}T00:00:00.000Z`);
    const localStart = dayBoundsForDateKeyInTimeZone(fromKey, tz).start;
    // Brazzaville UTC+1 → local midnight is 1h before UTC midnight
    expect(localStart.getTime()).toBeLessThan(utcMidnight.getTime());

    // 00:30 local would be dropped by a UTC-midnight lower bound
    const earlyLocal = new Date('2026-07-20T23:30:00.000Z');
    expect(earlyLocal.getTime()).toBeLessThan(utcMidnight.getTime());
    expect(earlyLocal.getTime()).toBeGreaterThanOrEqual(localStart.getTime());
  });

  test('overnight planned minutes wrap across midnight', () => {
    expect(shiftDurationMinutes(22 * 60, 6 * 60)).toBe(8 * 60);
    expect(shiftDurationMinutes(8 * 60, 17 * 60)).toBe(9 * 60);
  });
});
