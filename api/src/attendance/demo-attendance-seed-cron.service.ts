import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EmployeeStatus,
  LeaveApplicationStatus,
  TimeGateAttendanceAuthMethod,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { generateDocId } from '../common/utils/doc-id.util';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import {
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { PunchWindowService } from './punch-window.service';

/** Local hour (company TZ) when the empty-day demo seed may run. */
const SEED_LOCAL_HOUR = 10;

/** Fraction of scheduled staff left without punches → stay ABSENT on team-today. */
const ABSENT_RATE = 0.18;

function envEnabled(name: string): boolean {
  const v = (process.env[name] ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function hashSeed(...parts: string[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dateAtLocalMinutes(
  dateKey: string,
  minutes: number,
  timeZone: string,
): Date {
  const { start } = dayBoundsForDateKeyInTimeZone(dateKey, timeZone);
  return new Date(start.getTime() + minutes * 60_000);
}

/**
 * Demo / staging helper: if a company has **zero** attendance events for the
 * local calendar day, insert coherent random CHECK_IN/CHECK_OUT (+ timesheets).
 * If any real (or prior seeded) punch exists, do nothing — other employees stay absent.
 *
 * Gated by `DEMO_AUTO_ATTENDANCE_SEED=1`. Never enable in production with real users.
 */
@Injectable()
export class DemoAttendanceSeedCronService {
  private readonly logger = new Logger(DemoAttendanceSeedCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly holidayCalendar: HolidayCalendarService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async seedEmptyDayIfNeeded() {
    if (!envEnabled('DEMO_AUTO_ATTENDANCE_SEED')) return;

    const now = new Date();
    const companies = await this.prisma.company.findMany({
      select: { id: true, timeZone: true, name: true },
    });

    for (const company of companies) {
      const timeZone = resolveOrgTimeZone(company.timeZone);
      const localHour = Math.floor(dateToMinutesInTimeZone(now, timeZone) / 60);
      if (localHour !== SEED_LOCAL_HOUR) continue;

      try {
        const result = await this.seedCompanyDay(company.id, timeZone, now);
        if (result.skipped) {
          this.logger.debug(
            `Demo seed skip ${company.name ?? company.id}: ${result.reason}`,
          );
        } else {
          this.logger.log(
            `Demo seed ${company.name ?? company.id} ${result.dateKey}: ` +
              `${result.present} présents, ${result.absentLeft} absents laissés`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Demo seed failed for ${company.id}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  /** Exposed for manual / test invocation. */
  async seedCompanyDay(
    companyId: string,
    timeZone: string,
    now = new Date(),
  ): Promise<{
    skipped: boolean;
    reason?: string;
    dateKey: string;
    present: number;
    absentLeft: number;
  }> {
    const dateKey = dateKeyInTimeZone(now, timeZone);
    const workDate = new Date(`${dateKey}T00:00:00.000Z`);
    const bounds = dayBoundsForDateKeyInTimeZone(dateKey, timeZone);
    const nowMin = dateToMinutesInTimeZone(now, timeZone);

    const existing = await this.prisma.timeGateAttendanceEvent.count({
      where: {
        companyId,
        occurredAt: { gte: bounds.start, lte: bounds.end },
      },
    });
    if (existing > 0) {
      return {
        skipped: true,
        reason: `${existing} event(s) already today`,
        dateKey,
        present: 0,
        absentLeft: 0,
      };
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: EmployeeStatus.ACTIVE,
        branchId: { not: null },
      },
      select: {
        id: true,
        branchId: true,
        holidayListId: true,
        companyId: true,
      },
    });
    if (employees.length === 0) {
      return {
        skipped: true,
        reason: 'no active employees',
        dateKey,
        present: 0,
        absentLeft: 0,
      };
    }

    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(
      employees.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        holidayListId: e.holidayListId,
      })),
      workDate,
      workDate,
    );

    const onLeave = await this.prisma.leaveApplication.findMany({
      where: {
        companyId,
        employeeId: { in: employees.map((e) => e.id) },
        status: LeaveApplicationStatus.APPROVED,
        fromDate: { lte: workDate },
        toDate: { gte: workDate },
      },
      select: { employeeId: true },
    });
    const onLeaveIds = new Set(onLeave.map((l) => l.employeeId));

    const kiosks = await this.prisma.timeGateKiosk.findMany({
      where: { companyId },
      select: { id: true, branchId: true },
      orderBy: { createdAt: 'asc' },
    });
    const kioskByBranch = new Map<string, string>();
    for (const k of kiosks) {
      if (!kioskByBranch.has(k.branchId)) kioskByBranch.set(k.branchId, k.id);
    }

    const eligible: Array<{
      employeeId: string;
      branchId: string;
      kioskId: string;
      shiftStartMin: number;
      shiftEndMin: number;
      breakDurationMinutes: number;
    }> = [];

    for (const employee of employees) {
      if (!employee.branchId) continue;
      if (onLeaveIds.has(employee.id)) continue;
      if (isEmployeeHoliday(holidayIndex, employee.id, workDate)) continue;

      const windows = await this.punchWindows.resolveForEmployee(
        employee.id,
        workDate,
      );
      if (!windows) continue;

      const kioskId = kioskByBranch.get(employee.branchId);
      if (!kioskId) continue;

      eligible.push({
        employeeId: employee.id,
        branchId: employee.branchId,
        kioskId,
        shiftStartMin: windows.shiftStartMin,
        shiftEndMin: windows.shiftEndMin,
        breakDurationMinutes: windows.breakDurationMinutes ?? 0,
      });
    }

    if (eligible.length === 0) {
      return {
        skipped: true,
        reason: 'no scheduled employees with kiosk',
        dateKey,
        present: 0,
        absentLeft: 0,
      };
    }

    let present = 0;
    let absentLeft = 0;

    for (const row of eligible) {
      const roll = hashSeed(companyId, dateKey, row.employeeId) % 100;
      if (roll < ABSENT_RATE * 100) {
        absentLeft += 1;
        continue;
      }

      const lateRoll = hashSeed(companyId, dateKey, row.employeeId, 'late') % 100;
      const lateMinutes =
        lateRoll < 25 ? 5 + (lateRoll % 7) * 5 : lateRoll < 40 ? 2 + (lateRoll % 4) : 0;

      const checkInMin = Math.min(
        row.shiftStartMin + lateMinutes,
        Math.max(0, nowMin - 30),
      );
      // Checkout only if the day has progressed past mid-shift / end.
      const idealOut =
        row.shiftEndMin +
        ((hashSeed(companyId, dateKey, row.employeeId, 'out') % 21) - 10);
      const canCheckout = nowMin > row.shiftStartMin + 120;
      const checkOutMin = canCheckout
        ? Math.min(idealOut, nowMin - 5)
        : null;

      if (checkOutMin != null && checkOutMin <= checkInMin + 30) {
        // Not enough span — check-in only.
        await this.insertPunch({
          companyId,
          dateKey,
          employeeId: row.employeeId,
          branchId: row.branchId,
          kioskId: row.kioskId,
          type: TimeGateAttendanceEventType.CHECK_IN,
          occurredAt: dateAtLocalMinutes(dateKey, checkInMin, timeZone),
          timeZone,
        });
        await this.upsertTimesheet({
          companyId,
          employeeId: row.employeeId,
          workDate,
          workedMinutes: Math.max(0, nowMin - checkInMin - row.breakDurationMinutes),
          breakMinutes: row.breakDurationMinutes,
          lateMinutes,
        });
        present += 1;
        continue;
      }

      await this.insertPunch({
        companyId,
        dateKey,
        employeeId: row.employeeId,
        branchId: row.branchId,
        kioskId: row.kioskId,
        type: TimeGateAttendanceEventType.CHECK_IN,
        occurredAt: dateAtLocalMinutes(dateKey, checkInMin, timeZone),
        timeZone,
      });

      if (checkOutMin != null) {
        await this.insertPunch({
          companyId,
          dateKey,
          employeeId: row.employeeId,
          branchId: row.branchId,
          kioskId: row.kioskId,
          type: TimeGateAttendanceEventType.CHECK_OUT,
          occurredAt: dateAtLocalMinutes(dateKey, checkOutMin, timeZone),
          timeZone,
        });
      }

      const rawWorked =
        checkOutMin != null
          ? checkOutMin - checkInMin - row.breakDurationMinutes
          : Math.max(0, nowMin - checkInMin - row.breakDurationMinutes);

      await this.upsertTimesheet({
        companyId,
        employeeId: row.employeeId,
        workDate,
        workedMinutes: Math.max(0, rawWorked),
        breakMinutes: row.breakDurationMinutes,
        lateMinutes,
      });
      present += 1;
    }

    return { skipped: false, dateKey, present, absentLeft };
  }

  private async insertPunch(params: {
    companyId: string;
    dateKey: string;
    employeeId: string;
    branchId: string;
    kioskId: string;
    type: TimeGateAttendanceEventType;
    occurredAt: Date;
    timeZone: string;
  }) {
    const idempotencyKey = `demo-seed:${params.companyId}:${params.dateKey}:${params.employeeId}:${params.type}`;
    await this.prisma.timeGateAttendanceEvent.upsert({
      where: {
        companyId_idempotencyKey: {
          companyId: params.companyId,
          idempotencyKey,
        },
      },
      create: {
        id: generateDocId('AEV'),
        companyId: params.companyId,
        branchId: params.branchId,
        kioskId: params.kioskId,
        employeeId: params.employeeId,
        type: params.type,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        source: TimeGateAttendanceEventSource.KIOSK_ONLINE,
        authMethod: TimeGateAttendanceAuthMethod.FACE,
        occurredAt: params.occurredAt,
        receivedAt: new Date(),
        confidence: 0.9,
        idempotencyKey,
        meta: {
          demoSeed: true,
          timeZone: params.timeZone,
        },
      },
      update: {
        occurredAt: params.occurredAt,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
      },
    });
  }

  private async upsertTimesheet(params: {
    companyId: string;
    employeeId: string;
    workDate: Date;
    workedMinutes: number;
    breakMinutes: number;
    lateMinutes: number;
  }) {
    const existing = await this.prisma.timeGateTimesheetDay.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: params.employeeId,
          workDate: params.workDate,
        },
      },
      select: { id: true },
    });

    const data = {
      workedMinutes: Math.round(params.workedMinutes),
      breakMinutes: Math.round(params.breakMinutes),
      lateMinutes: Math.round(params.lateMinutes),
      overtimeMinutes: 0,
      status: TimeGateTimesheetDayStatus.OPEN,
      anomalyFlags: { flags: ['DEMO_SEED'] },
    };

    if (existing) {
      await this.prisma.timeGateTimesheetDay.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.timeGateTimesheetDay.create({
      data: {
        id: generateDocId('TSD'),
        companyId: params.companyId,
        employeeId: params.employeeId,
        workDate: params.workDate,
        ...data,
      },
    });
  }
}
