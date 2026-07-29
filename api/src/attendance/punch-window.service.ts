import { Injectable } from '@nestjs/common';
import { ShiftType, WeekDay } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  dateToMinutes,
  resolveShiftBounds,
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

    const exception = await this.findDayException(shiftType.id, day);
    if (exception?.isOff) return null;

    if (exception && !exception.isOff) {
      const startMin = timeDateToMinutes(exception.startTime);
      const endMin = timeDateToMinutes(exception.endTime);
      if (startMin == null || endMin == null) return null;
      return this.buildWindows(shiftType, startMin, endMin);
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
      return this.buildWindows(shiftType, startMin, endMin);
    }

    if (weekDays.length === 0 || !weekDayRow) return null;

    const { startMin, endMin } = resolveShiftBounds(
      shiftType.startTime,
      shiftType.endTime,
      weekDayRow.startTime,
      weekDayRow.endTime,
    );

    return this.buildWindows(shiftType, startMin, endMin);
  }

  private buildWindows(
    shiftType: ShiftType,
    shiftStartMin: number,
    shiftEndMin: number,
  ): ResolvedPunchWindows {
    const checkInStartMin =
      timeDateToMinutes(shiftType.checkInWindowStart) ??
      Math.max(0, shiftStartMin - 60);
    const checkInEndMin =
      timeDateToMinutes(shiftType.checkInWindowEnd) ??
      (shiftStartMin < 12 * 60 ? 12 * 60 : shiftStartMin + 120);
    const checkOutStartMin =
      timeDateToMinutes(shiftType.checkOutWindowStart) ?? shiftEndMin;
    const checkOutEndMin =
      timeDateToMinutes(shiftType.checkOutWindowEnd) ?? 24 * 60;
    const breakStartMin = timeDateToMinutes(shiftType.breakWindowStart);
    const breakEndMin = timeDateToMinutes(shiftType.breakWindowEnd);

    return {
      shiftTypeId: shiftType.id,
      shiftStartMin,
      shiftEndMin,
      checkInStartMin,
      checkInEndMin,
      checkOutStartMin,
      checkOutEndMin,
      breakStartMin,
      breakEndMin,
      breakDurationMinutes: shiftType.breakDurationMinutes ?? 60,
    };
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

    return rows.find((row) => this.coversDate(row.startDate, row.endDate, day)) ?? null;
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
): import('./punch-window.types').DayPunchState {
  const accepted = events;
  const checkIn = accepted.find((e) => e.type === 'CHECK_IN');
  const checkOut = accepted.some((e) => e.type === 'CHECK_OUT');
  const breakEnd = accepted.some((e) => e.type === 'BREAK_END');

  return {
    hasCheckIn: Boolean(checkIn),
    hasCheckOut: checkOut,
    hasBreakEnd: breakEnd,
    checkInAtMin: checkIn ? dateToMinutes(checkIn.occurredAt) : null,
  };
}
