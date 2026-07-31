import { Injectable } from '@nestjs/common';
import { ShiftType, WeekDay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dateKeyAddDays,
  dateKeyInTimeZone,
  dateToMinutes,
  dateToMinutesInTimeZone,
  isOvernightShift,
  punchEventBoundsForWorkDate,
  resolvePunchWorkDateKey,
  resolveShiftBounds,
  shiftDurationMinutes,
  timeDateToMinutes,
  toWeekDay,
} from '../common/utils/punch-time.util';
import { ResolvedPunchWindows } from './punch-window.types';

type ShiftTypeWithWeekDays = ShiftType & {
  weekDays: Array<{ day: WeekDay; startTime: string; endTime: string }>;
  shiftName?: string;
};

export type ResolvedEmployeeSchedule = {
  isWorkDay: boolean;
  /** assignment = règle récurrente ; day_exception = override date sur l'horaire */
  source: 'assignment' | 'day_exception' | 'employee_default' | 'company_default' | null;
  shiftTypeId: string | null;
  shiftName: string | null;
  startTime: string | null;
  endTime: string | null;
};

function minutesToHm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

@Injectable()
export class PunchWindowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Résolution : exception de l'horaire (date) > jours ouvrés de l'affectation.
   */
  async resolveScheduleForEmployee(
    employeeId: string,
    at: Date,
  ): Promise<ResolvedEmployeeSchedule> {
    const day = toUtcDay(at);
    const assignment = await this.findActiveAssignment(employeeId, day);
    const shiftType = (assignment?.shiftType as ShiftTypeWithWeekDays | undefined) ?? null;

    if (!shiftType) {
      return {
        isWorkDay: false,
        source: null,
        shiftTypeId: null,
        shiftName: null,
        startTime: null,
        endTime: null,
      };
    }

    const exception = await this.findDayException(shiftType.id, day);

    if (exception) {
      if (exception.isOff) {
        return {
          isWorkDay: false,
          source: 'day_exception',
          shiftTypeId: shiftType.id,
          shiftName: shiftType.shiftName ?? null,
          startTime: null,
          endTime: null,
        };
      }
      const startMin = timeDateToMinutes(exception.startTime);
      const endMin = timeDateToMinutes(exception.endTime);
      if (startMin == null || endMin == null) {
        return {
          isWorkDay: false,
          source: 'day_exception',
          shiftTypeId: shiftType.id,
          shiftName: shiftType.shiftName ?? null,
          startTime: null,
          endTime: null,
        };
      }
      return {
        isWorkDay: true,
        source: 'day_exception',
        shiftTypeId: shiftType.id,
        shiftName: shiftType.shiftName ?? null,
        startTime: minutesToHm(startMin),
        endTime: minutesToHm(endMin),
      };
    }

    const weekDays = shiftType.weekDays;
    const weekDay = toWeekDay(day);
    const weekDayRow = weekDays.find((row) => row.day === weekDay);
    const singleDay =
      assignment != null &&
      this.isSingleDayAssignment(assignment.startDate, assignment.endDate, day);

    // One-day assignment from a shift swap: force the day even if weekDays differ.
    if (!weekDayRow && singleDay) {
      const { startMin, endMin } = resolveShiftBounds(
        shiftType.startTime,
        shiftType.endTime,
        null,
        null,
      );
      return {
        isWorkDay: true,
        source: 'assignment',
        shiftTypeId: shiftType.id,
        shiftName: shiftType.shiftName ?? null,
        startTime: minutesToHm(startMin),
        endTime: minutesToHm(endMin),
      };
    }

    if (weekDays.length === 0 || !weekDayRow) {
      return {
        isWorkDay: false,
        source: 'assignment',
        shiftTypeId: shiftType.id,
        shiftName: shiftType.shiftName ?? null,
        startTime: null,
        endTime: null,
      };
    }

    const { startMin, endMin } = resolveShiftBounds(
      shiftType.startTime,
      shiftType.endTime,
      weekDayRow.startTime,
      weekDayRow.endTime,
    );

    return {
      isWorkDay: true,
      source: 'assignment',
      shiftTypeId: shiftType.id,
      shiftName: shiftType.shiftName ?? null,
      startTime: minutesToHm(startMin),
      endTime: minutesToHm(endMin),
    };
  }

  async resolveForEmployee(
    employeeId: string,
    at: Date,
  ): Promise<ResolvedPunchWindows | null> {
    const day = toUtcDay(at);
    const assignment = await this.findActiveAssignment(employeeId, day);
    const shiftType = (assignment?.shiftType as ShiftTypeWithWeekDays | undefined) ?? null;
    if (!shiftType) return null;
    const allowCheckInAfterBreakStart = await this.resolveAllowCheckInAfterBreakStart(
      shiftType.companyId,
    );

    const exception = await this.findDayException(shiftType.id, day);
    if (exception?.isOff) return null;

    if (exception && !exception.isOff) {
      const startMin = timeDateToMinutes(exception.startTime);
      const endMin = timeDateToMinutes(exception.endTime);
      if (startMin == null || endMin == null) return null;
      return this.buildWindows(shiftType, startMin, endMin, allowCheckInAfterBreakStart);
    }

    const weekDays = shiftType.weekDays;
    const weekDay = toWeekDay(day);
    const weekDayRow = weekDays.find((row) => row.day === weekDay);
    const singleDay =
      assignment != null &&
      this.isSingleDayAssignment(assignment.startDate, assignment.endDate, day);

    if (!weekDayRow && singleDay) {
      const { startMin, endMin } = resolveShiftBounds(
        shiftType.startTime,
        shiftType.endTime,
        null,
        null,
      );
      return this.buildWindows(shiftType, startMin, endMin, allowCheckInAfterBreakStart);
    }

    if (weekDays.length === 0 || !weekDayRow) return null;

    const { startMin, endMin } = resolveShiftBounds(
      shiftType.startTime,
      shiftType.endTime,
      weekDayRow.startTime,
      weekDayRow.endTime,
    );

    return this.buildWindows(shiftType, startMin, endMin, allowCheckInAfterBreakStart);
  }

  /**
   * Number of days in [from, to] where the employee has a planned work shift
   * (assignment + week days / day exceptions). Used for absence daily rate.
   */
  async countScheduledWorkDays(
    employeeId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const start = toUtcDay(from);
    const end = toUtcDay(to);
    if (start > end) return 0;

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { employeeId },
      include: { shiftType: { include: { weekDays: true } } },
      orderBy: { startDate: 'desc' },
    });
    if (assignments.length === 0) return 0;

    const shiftTypeIds = [
      ...new Set(assignments.map((a) => a.shiftTypeId).filter(Boolean)),
    ] as string[];
    const exceptions = await this.prisma.timeGateScheduleDayException.findMany({
      where: {
        shiftTypeId: { in: shiftTypeIds },
        workDate: { gte: start, lte: end },
      },
    });
    const exceptionByKey = new Map(
      exceptions.map((e) => [`${e.shiftTypeId}|${e.workDate.toISOString().slice(0, 10)}`, e]),
    );

    let count = 0;
    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1),
      )
    ) {
      const covering = assignments.filter((row) =>
        this.coversDate(row.startDate, row.endDate, cursor),
      );
      if (covering.length === 0) continue;

      const singleDay = covering.find((row) =>
        this.isSingleDayAssignment(row.startDate, row.endDate, cursor),
      );
      const bounded = covering.find((row) => row.startDate != null && row.endDate != null);
      const assignment = singleDay ?? bounded ?? covering[0];
      if (!assignment?.shiftType) continue;

      const shiftType = assignment.shiftType as ShiftTypeWithWeekDays;
      const dayKey = cursor.toISOString().slice(0, 10);
      const exception = exceptionByKey.get(`${shiftType.id}|${dayKey}`);
      if (exception?.isOff) continue;
      if (exception && !exception.isOff) {
        const startMin = timeDateToMinutes(exception.startTime);
        const endMin = timeDateToMinutes(exception.endTime);
        if (startMin != null && endMin != null) count += 1;
        continue;
      }

      const weekDay = toWeekDay(cursor);
      const weekDayRow = shiftType.weekDays.find((row) => row.day === weekDay);
      const isSingle = this.isSingleDayAssignment(
        assignment.startDate,
        assignment.endDate,
        cursor,
      );
      if (weekDayRow || isSingle) count += 1;
    }

    return count;
  }

  /**
   * Resolve the punch work date (previous local day when still in an overnight
   * morning segment), windows for that day, and event query bounds spanning midnight.
   */
  async resolvePunchContext(
    employeeId: string,
    at: Date,
    timeZone: string,
  ): Promise<{
    workDateKey: string;
    windows: ResolvedPunchWindows | null;
    bounds: { start: Date; end: Date };
    atMin: number;
  }> {
    const todayKey = dateKeyInTimeZone(at, timeZone);
    const yesterdayKey = dateKeyAddDays(todayKey, -1);
    const atMin = dateToMinutesInTimeZone(at, timeZone);

    const yesterdayWindows = await this.resolveForEmployee(
      employeeId,
      new Date(`${yesterdayKey}T00:00:00.000Z`),
    );
    const workDateKey = resolvePunchWorkDateKey(todayKey, atMin, yesterdayWindows);

    const windows =
      workDateKey === yesterdayKey
        ? yesterdayWindows
        : await this.resolveForEmployee(employeeId, new Date(`${todayKey}T00:00:00.000Z`));

    const overnight = Boolean(
      windows && isOvernightShift(windows.shiftStartMin, windows.shiftEndMin),
    );
    const bounds = punchEventBoundsForWorkDate(workDateKey, timeZone, overnight);

    return { workDateKey, windows, bounds, atMin };
  }

  private buildWindows(
    shiftType: ShiftType,
    shiftStartMin: number,
    shiftEndMin: number,
    allowCheckInAfterBreakStart: boolean,
  ): ResolvedPunchWindows {
    const overnight = isOvernightShift(shiftStartMin, shiftEndMin);
    const checkInStartMin =
      timeDateToMinutes(shiftType.checkInWindowStart) ??
      Math.max(0, shiftStartMin - 60);
    const checkInEndMin =
      timeDateToMinutes(shiftType.checkInWindowEnd) ??
      (overnight
        ? (shiftStartMin + 120) % (24 * 60)
        : shiftStartMin < 12 * 60
          ? 12 * 60
          : shiftStartMin + 120);
    const checkOutStartMin =
      timeDateToMinutes(shiftType.checkOutWindowStart) ?? shiftEndMin;
    const checkOutEndMin =
      timeDateToMinutes(shiftType.checkOutWindowEnd) ??
      (overnight ? (shiftEndMin + 120) % (24 * 60) : 24 * 60);
    const breakStartMin = timeDateToMinutes(shiftType.breakWindowStart);
    const breakEndMin = timeDateToMinutes(shiftType.breakWindowEnd);
    const breakDurationMinutes =
      breakStartMin != null && breakEndMin != null
        ? shiftDurationMinutes(breakStartMin, breakEndMin)
        : 0;

    return {
      shiftTypeId: shiftType.id,
      allowCheckInAfterBreakStart,
      shiftStartMin,
      shiftEndMin,
      checkInStartMin,
      checkInEndMin,
      checkOutStartMin,
      checkOutEndMin,
      breakStartMin,
      breakEndMin,
      breakDurationMinutes,
    };
  }

  private async resolveAllowCheckInAfterBreakStart(companyId: string | null): Promise<boolean> {
    if (!companyId) {
      return process.env.TIMEGATE_ALLOW_CHECKIN_AFTER_BREAK_START !== '0';
    }
    const settings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      select: { allowCheckInAfterBreakStart: true },
    });
    if (settings?.allowCheckInAfterBreakStart != null) {
      return settings.allowCheckInAfterBreakStart;
    }
    return process.env.TIMEGATE_ALLOW_CHECKIN_AFTER_BREAK_START !== '0';
  }

  private async findDayException(shiftTypeId: string, day: Date) {
    return this.prisma.timeGateScheduleDayException.findUnique({
      where: {
        shiftTypeId_workDate: {
          shiftTypeId,
          workDate: day,
        },
      },
    });
  }

  private async findActiveAssignment(employeeId: string, day: Date) {
    const rows = await this.prisma.shiftAssignment.findMany({
      where: { employeeId },
      include: {
        shiftType: { include: { weekDays: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const covering = rows.filter((row) => this.coversDate(row.startDate, row.endDate, day));
    if (covering.length === 0) return null;

    // One-day overrides (shift swaps / night fixtures) must win over open-ended ranges.
    const singleDay = covering.find((row) =>
      this.isSingleDayAssignment(row.startDate, row.endDate, day),
    );
    if (singleDay) return singleDay;

    const bounded = covering.find((row) => row.startDate != null && row.endDate != null);
    if (bounded) return bounded;

    return covering[0] ?? null;
  }

  private coversDate(start: Date | null, end: Date | null, day: Date): boolean {
    const target = day.toISOString().slice(0, 10);
    const s = start ? start.toISOString().slice(0, 10) : null;
    const e = end ? end.toISOString().slice(0, 10) : null;
    if (!s && !e) return true;
    if (s && !e) return target >= s;
    if (!s && e) return target <= e;
    return target >= s! && target <= e!;
  }

  private isSingleDayAssignment(start: Date | null, end: Date | null, day: Date): boolean {
    if (!start || !end) return false;
    const d = day.toISOString().slice(0, 10);
    return start.toISOString().slice(0, 10) === d && end.toISOString().slice(0, 10) === d;
  }
}

export function buildDayPunchStateFromEvents(
  events: Array<{ type: string; occurredAt: Date }>,
  timeZone?: string,
): import('./punch-window.types').DayPunchState {
  const accepted = events;
  const checkIn = accepted.find((e) => e.type === 'CHECK_IN');
  const checkOut = accepted.some((e) => e.type === 'CHECK_OUT');
  const breakEnd = accepted.some((e) => e.type === 'BREAK_END');

  return {
    hasCheckIn: Boolean(checkIn),
    hasCheckOut: checkOut,
    hasBreakEnd: breakEnd,
    checkInAtMin: checkIn
      ? timeZone
        ? dateToMinutesInTimeZone(checkIn.occurredAt, timeZone)
        : dateToMinutes(checkIn.occurredAt)
      : null,
  };
}
