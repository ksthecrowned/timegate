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
};

@Injectable()
export class PunchWindowService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForEmployee(
    employeeId: string,
    at: Date,
  ): Promise<ResolvedPunchWindows | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        companyId: true,
        defaultShiftId: true,
        defaultShift: { include: { weekDays: true } },
      },
    });
    if (!employee) return null;

    const assignment = await this.findActiveAssignment(employeeId, at);
    let shiftType: ShiftTypeWithWeekDays | null =
      assignment?.shiftType ??
      (employee.defaultShift as ShiftTypeWithWeekDays | null) ??
      null;

    if (!shiftType && employee.companyId) {
      const settings = await this.prisma.timeGateSystemSettings.findUnique({
        where: { companyId: employee.companyId },
        include: { defaultShiftType: { include: { weekDays: true } } },
      });
      shiftType = (settings?.defaultShiftType as ShiftTypeWithWeekDays | null) ?? null;
    }

    if (!shiftType) return null;

    const weekDay = toWeekDay(at);
    const weekDayRow = shiftType.weekDays.find((row) => row.day === weekDay);
    const { startMin, endMin } = resolveShiftBounds(
      shiftType.startTime,
      shiftType.endTime,
      weekDayRow?.startTime,
      weekDayRow?.endTime,
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

  private async findActiveAssignment(employeeId: string, at: Date) {
    const day = new Date(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()));
    const rows = await this.prisma.shiftAssignment.findMany({
      where: { employeeId },
      include: {
        shiftType: { include: { weekDays: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    return (
      rows.find((row) => this.coversDate(row.startDate, row.endDate, day)) ?? null
    );
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
