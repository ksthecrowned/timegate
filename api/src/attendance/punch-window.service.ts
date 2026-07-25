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
  source: 'assignment' | 'employee_default' | 'company_default' | null;
  shiftTypeId: string | null;
  shiftName: string | null;
  /** Local HH:mm when scheduled */
  startTime: string | null;
  endTime: string | null;
};

function minutesToHm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class PunchWindowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Résout le planning applicable (affectation → horaire employé → défaut entreprise)
   * et indique si `at` est un jour travaillé selon les jours ouvrés.
   */
  async resolveScheduleForEmployee(
    employeeId: string,
    at: Date,
  ): Promise<ResolvedEmployeeSchedule> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        companyId: true,
        defaultShiftId: true,
        defaultShift: { include: { weekDays: true } },
      },
    });
    if (!employee) {
      return {
        isWorkDay: false,
        source: null,
        shiftTypeId: null,
        shiftName: null,
        startTime: null,
        endTime: null,
      };
    }

    const assignment = await this.findActiveAssignment(employeeId, at);
    let source: ResolvedEmployeeSchedule['source'] = null;
    let shiftType: ShiftTypeWithWeekDays | null = null;

    if (assignment?.shiftType) {
      shiftType = assignment.shiftType as ShiftTypeWithWeekDays;
      source = 'assignment';
    } else if (employee.defaultShift) {
      shiftType = employee.defaultShift as ShiftTypeWithWeekDays;
      source = 'employee_default';
    } else if (employee.companyId) {
      const settings = await this.prisma.timeGateSystemSettings.findUnique({
        where: { companyId: employee.companyId },
        include: { defaultShiftType: { include: { weekDays: true } } },
      });
      if (settings?.defaultShiftType) {
        shiftType = settings.defaultShiftType as ShiftTypeWithWeekDays;
        source = 'company_default';
      }
    }

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

    let weekDays = shiftType.weekDays;
    if (weekDays.length === 0 && employee.companyId) {
      const settings = await this.prisma.timeGateSystemSettings.findUnique({
        where: { companyId: employee.companyId },
        include: { defaultShiftType: { include: { weekDays: true } } },
      });
      const companyWeekDays = settings?.defaultShiftType?.weekDays;
      if (companyWeekDays && companyWeekDays.length > 0) {
        weekDays = companyWeekDays;
      }
    }

    const weekDay = toWeekDay(at);
    const weekDayRow = weekDays.find((row) => row.day === weekDay);
    if (weekDays.length > 0 && !weekDayRow) {
      return {
        isWorkDay: false,
        source,
        shiftTypeId: shiftType.id,
        shiftName: shiftType.shiftName ?? null,
        startTime: null,
        endTime: null,
      };
    }

    const { startMin, endMin } = resolveShiftBounds(
      shiftType.startTime,
      shiftType.endTime,
      weekDayRow?.startTime,
      weekDayRow?.endTime,
    );

    return {
      isWorkDay: true,
      source,
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

    // Jours ouvrés : ceux de l'horaire résolu ; si non configurés, ceux du défaut entreprise.
    let weekDays = shiftType.weekDays;
    if (weekDays.length === 0 && employee.companyId) {
      const settings = await this.prisma.timeGateSystemSettings.findUnique({
        where: { companyId: employee.companyId },
        include: { defaultShiftType: { include: { weekDays: true } } },
      });
      const companyWeekDays = settings?.defaultShiftType?.weekDays;
      if (companyWeekDays && companyWeekDays.length > 0) {
        weekDays = companyWeekDays;
      }
    }

    // Pas de règle weekend : un jour est travaillé ssi le planning résolu le prévoit.
    const weekDay = toWeekDay(at);
    const weekDayRow = weekDays.find((row) => row.day === weekDay);
    if (weekDays.length > 0 && !weekDayRow) {
      return null;
    }

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
