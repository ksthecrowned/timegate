import {
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
} from '@prisma/client';
import { dateToMinutes } from './punch-time.util';
import { ResolvedPunchWindows } from '../../attendance/punch-window.types';

type BreakEvent = {
  type: TimeGateAttendanceEventType;
  status: TimeGateAttendanceEventStatus;
  occurredAt: Date;
};

export type BreakDeductionResult = {
  breakMinutes: number;
  breakSurplusMinutes: number;
};

function diffMinutes(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 60_000);
}

function combineDayAndMinutes(day: Date, minutesFromMidnight: number): Date {
  const result = new Date(day);
  result.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return result;
}

/**
 * Lot E — pause auto-déduite + ajustement si reprise (BREAK_END) après fin de plage.
 */
export function computeBreakDeduction(
  events: BreakEvent[],
  windows: ResolvedPunchWindows | null,
): BreakDeductionResult {
  const accepted = events.filter(
    (e) => e.status === TimeGateAttendanceEventStatus.ACCEPTED,
  );
  const hasCheckIn = accepted.some((e) => e.type === TimeGateAttendanceEventType.CHECK_IN);
  if (!hasCheckIn) {
    return { breakMinutes: 0, breakSurplusMinutes: 0 };
  }

  const authorizedBreak = windows?.breakDurationMinutes ?? 0;
  if (authorizedBreak <= 0) {
    return { breakMinutes: 0, breakSurplusMinutes: 0 };
  }

  const breakEndEvent = accepted.find((e) => e.type === TimeGateAttendanceEventType.BREAK_END);
  const breakStartMin = windows?.breakStartMin ?? null;
  const breakEndMin = windows?.breakEndMin ?? null;

  if (breakEndEvent && breakStartMin != null) {
    const breakStartAt = combineDayAndMinutes(breakEndEvent.occurredAt, breakStartMin);
    const actualBreak = diffMinutes(breakStartAt, breakEndEvent.occurredAt);
    const resumeMin = dateToMinutes(breakEndEvent.occurredAt);

    if (breakEndMin != null && resumeMin > breakEndMin) {
      const surplus = Math.max(0, actualBreak - authorizedBreak);
      return { breakMinutes: actualBreak, breakSurplusMinutes: surplus };
    }

    return { breakMinutes: authorizedBreak, breakSurplusMinutes: 0 };
  }

  return { breakMinutes: authorizedBreak, breakSurplusMinutes: 0 };
}
