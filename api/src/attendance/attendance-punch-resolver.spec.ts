import { describe, expect, test } from 'bun:test';
import { resolveAttendancePunch } from './attendance-punch-resolver';
import {
  afterMinuteWindowEnd,
  beforeMinuteWindowStart,
  belongsToPreviousOvernightWorkDate,
  inMinuteWindow,
  isOvernightShift,
  punchEventBoundsForWorkDate,
  resolvePunchWorkDateKey,
  shiftDurationMinutes,
} from '../common/utils/punch-time.util';
import type { DayPunchState, ResolvedPunchWindows } from './punch-window.types';

const overnightWindows: ResolvedPunchWindows = {
  shiftTypeId: 'SHIFT-NIGHT',
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

const emptyState: DayPunchState = {
  hasCheckIn: false,
  hasCheckOut: false,
  hasBreakEnd: false,
  checkInAtMin: null,
};

describe('overnight shift helpers', () => {
  test('detects overnight and duration across midnight', () => {
    expect(isOvernightShift(22 * 60, 6 * 60)).toBe(true);
    expect(shiftDurationMinutes(22 * 60, 6 * 60)).toBe(8 * 60);
    expect(inMinuteWindow(23 * 60, 22 * 60, 6 * 60)).toBe(true);
    expect(inMinuteWindow(3 * 60, 22 * 60, 6 * 60)).toBe(true);
    expect(inMinuteWindow(12 * 60, 22 * 60, 6 * 60)).toBe(false);
  });

  test('before/after window distinguish early evening vs after midnight', () => {
    expect(beforeMinuteWindowStart(20 * 60, 21 * 60, 0)).toBe(true);
    expect(afterMinuteWindowEnd(30, 21 * 60, 0)).toBe(true);
  });

  test('morning punch attaches to previous overnight work date', () => {
    expect(belongsToPreviousOvernightWorkDate(3 * 60, overnightWindows)).toBe(true);
    expect(belongsToPreviousOvernightWorkDate(7 * 60, overnightWindows)).toBe(true);
    expect(belongsToPreviousOvernightWorkDate(9 * 60, overnightWindows)).toBe(false);
    expect(belongsToPreviousOvernightWorkDate(23 * 60, overnightWindows)).toBe(false);

    expect(resolvePunchWorkDateKey('2026-07-30', 7 * 60, overnightWindows)).toBe('2026-07-29');
    expect(resolvePunchWorkDateKey('2026-07-30', 23 * 60, overnightWindows)).toBe('2026-07-30');
    expect(resolvePunchWorkDateKey('2026-07-30', 7 * 60, null)).toBe('2026-07-30');
  });

  test('overnight event bounds span into next local day', () => {
    const overnight = punchEventBoundsForWorkDate('2026-07-29', 'Africa/Brazzaville', true);
    const dayOnly = punchEventBoundsForWorkDate('2026-07-29', 'Africa/Brazzaville', false);
    expect(overnight.end.getTime()).toBeGreaterThan(dayOnly.end.getTime());
  });
});

describe('resolveAttendancePunch overnight', () => {
  test('rejects check-in before evening window', () => {
    const result = resolveAttendancePunch(20 * 60, overnightWindows, emptyState);
    expect(result.action).toBe('REJECTED');
  });

  test('accepts check-in in evening window', () => {
    const result = resolveAttendancePunch(22 * 60 + 15, overnightWindows, emptyState);
    expect(result.action).toBe('CHECK_IN');
  });

  test('accepts check-out in morning window after check-in', () => {
    const state: DayPunchState = {
      hasCheckIn: true,
      hasCheckOut: false,
      hasBreakEnd: false,
      checkInAtMin: 22 * 60 + 10,
    };
    const result = resolveAttendancePunch(6 * 60 + 30, overnightWindows, state);
    expect(result.action).toBe('CHECK_OUT');
  });
});
