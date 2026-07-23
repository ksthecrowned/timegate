import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AttendanceStatus,
  EmployeeStatus,
  KioskStatus,
  LeaveApplicationStatus,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { dateToMinutes } from '../common/utils/punch-time.util';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { PunchWindowService, buildDayPunchStateFromEvents } from './punch-window.service';
import { NotificationsService } from '../notifications/notifications.service';

const KIOSK_OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;
/** Délai minimum par défaut avant la première relance manager (Lot D #13). */
const DEFAULT_REVIEW_REMINDER_MIN_AGE_MS = 24 * 60 * 60 * 1000;

type ReviewReminderGroup = {
  companyId: string;
  branchId?: string;
  pendingEventCount: number;
  pendingDayCount: number;
};

@Injectable()
export class PunchCronService {
  private readonly logger = new Logger(PunchCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly notifications: NotificationsService,
    private readonly holidayCalendar: HolidayCalendarService,
  ) {}

  /** Fin fenêtre arrivée : absent auto si pas de CHECK_IN. */
  @Cron(CronExpression.EVERY_HOUR)
  async processMissedCheckIns() {
    const now = new Date();
    const atMin = dateToMinutes(now);
    const dayStart = this.startOfDay(now);
    const dayEnd = this.endOfDay(now);

    const employees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        companyId: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        branchId: true,
        holidayListId: true,
      },
    });

    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(
      employees.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        holidayListId: e.holidayListId,
      })),
      dayStart,
      dayStart,
    );

    let marked = 0;
    for (const employee of employees) {
      if (isEmployeeHoliday(holidayIndex, employee.id, dayStart)) continue;

      const onLeave = await this.prisma.leaveApplication.findFirst({
        where: {
          employeeId: employee.id,
          status: LeaveApplicationStatus.APPROVED,
          fromDate: { lte: dayStart },
          toDate: { gte: dayStart },
        },
      });
      if (onLeave) continue;

      const windows = await this.punchWindows.resolveForEmployee(employee.id, now);
      if (!windows || atMin < windows.checkInEndMin) continue;

      const checkIn = await this.prisma.timeGateAttendanceEvent.findFirst({
        where: {
          employeeId: employee.id,
          type: TimeGateAttendanceEventType.CHECK_IN,
          status: {
            in: [
              TimeGateAttendanceEventStatus.ACCEPTED,
              TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
            ],
          },
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (checkIn) continue;

      const existingAttendance = await this.prisma.attendance.findUnique({
        where: {
          employeeId_attendanceDate: { employeeId: employee.id, attendanceDate: dayStart },
        },
      });
      if (existingAttendance?.status === AttendanceStatus.PRESENT) continue;

      const employeeName =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
        employee.employeeName;

      const attendance = await this.prisma.attendance.upsert({
        where: {
          employeeId_attendanceDate: { employeeId: employee.id, attendanceDate: dayStart },
        },
        create: {
          id: generateDocId('ATT'),
          employeeId: employee.id,
          employeeName,
          attendanceDate: dayStart,
          status: AttendanceStatus.ABSENT,
          companyId: employee.companyId,
          shiftId: windows.shiftTypeId,
        },
        update: { status: AttendanceStatus.ABSENT, employeeName },
      });

      await this.prisma.timeGateAbsenceRecord.upsert({
        where: {
          employeeId_recordDate: { employeeId: employee.id, recordDate: dayStart },
        },
        create: {
          id: generateDocId('ABS'),
          companyId: employee.companyId,
          employeeId: employee.id,
          recordDate: dayStart,
          attendanceId: attendance.id,
          justified: false,
          reason: 'Absence automatique (fenêtre arrivée expirée)',
        },
        update: {
          attendanceId: attendance.id,
          reason: 'Absence automatique (fenêtre arrivée expirée)',
        },
      });
      marked += 1;

      try {
        await this.notifications.notifyAutoAbsence({
          companyId: employee.companyId,
          branchId: employee.branchId ?? undefined,
          employeeId: employee.id,
          employeeName,
          recordDate: dayStart,
        });
      } catch (err) {
        this.logger.warn(
          `Absence notification failed for ${employee.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (marked > 0) {
      this.logger.log(`Marked ${marked} automatic absence(s) for ${dayStart.toISOString().slice(0, 10)}`);
    }
  }

  /** 00h30 : CHECK_IN sans CHECK_OUT → REVIEW_REQUIRED (sans CHECK_OUT synthétique). */
  @Cron('30 0 * * *')
  async processUnclosedCheckIns() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const workDate = this.startOfDay(yesterday);
    const dayStart = workDate;
    const dayEnd = this.endOfDay(yesterday);

    const checkIns = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        type: TimeGateAttendanceEventType.CHECK_IN,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        occurredAt: { gte: dayStart, lte: dayEnd },
        employeeId: { not: null },
      },
      select: { id: true, employeeId: true, companyId: true, occurredAt: true },
    });

    let flagged = 0;
    for (const checkIn of checkIns) {
      if (!checkIn.employeeId) continue;

      const checkOut = await this.prisma.timeGateAttendanceEvent.findFirst({
        where: {
          employeeId: checkIn.employeeId,
          type: TimeGateAttendanceEventType.CHECK_OUT,
          status: TimeGateAttendanceEventStatus.ACCEPTED,
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (checkOut) continue;

      const windows = await this.punchWindows.resolveForEmployee(
        checkIn.employeeId,
        checkIn.occurredAt,
      );
      const shiftEndMin = windows?.shiftEndMin ?? 17 * 60;
      const breakMinutes = windows?.breakDurationMinutes ?? 60;
      const checkInMin = dateToMinutes(checkIn.occurredAt);
      const inferredWorked = Math.max(0, shiftEndMin - checkInMin - breakMinutes);

      await this.prisma.timeGateTimesheetDay.upsert({
        where: {
          employeeId_workDate: { employeeId: checkIn.employeeId, workDate },
        },
        create: {
          id: generateDocId('TSD'),
          companyId: checkIn.companyId,
          employeeId: checkIn.employeeId,
          workDate,
          workedMinutes: inferredWorked,
          breakMinutes,
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          anomalyFlags: ['UNCLOSED_CHECKIN', 'CHECKOUT_INFERRED'],
        },
        update: {
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          workedMinutes: inferredWorked,
          breakMinutes,
          anomalyFlags: ['UNCLOSED_CHECKIN', 'CHECKOUT_INFERRED'],
        },
      });
      flagged += 1;

      try {
        const employee = await this.prisma.employee.findUnique({
          where: { id: checkIn.employeeId },
          select: {
            firstName: true,
            lastName: true,
            employeeName: true,
            branchId: true,
          },
        });
        const employeeName =
          `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim() ||
          employee?.employeeName ||
          'Employé';
        await this.notifications.notifyUnclosedCheckIn({
          companyId: checkIn.companyId,
          branchId: employee?.branchId ?? undefined,
          employeeId: checkIn.employeeId,
          employeeName,
          workDate,
        });
      } catch (err) {
        this.logger.warn(
          `Unclosed check-in notification failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (flagged > 0) {
      this.logger.log(`Flagged ${flagged} unclosed check-in day(s) for ${workDate.toISOString().slice(0, 10)}`);
    }
  }

  /** Rappel employé : entre fin de shift et minuit si CHECK_IN sans CHECK_OUT (Lot D #21). */
  @Cron(CronExpression.EVERY_HOUR)
  async sendUnclosedCheckInReminders() {
    const now = new Date();
    const atMin = dateToMinutes(now);
    const dayStart = this.startOfDay(now);
    const dayEnd = this.endOfDay(now);

    const employees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        companyId: true,
        employeeName: true,
        firstName: true,
        lastName: true,
      },
    });

    let sent = 0;
    const settingsByCompany = new Map<
      string,
      { notificationUnclosedReminderDelayMinutes: number }
    >();
    for (const employee of employees) {
      const windows = await this.punchWindows.resolveForEmployee(employee.id, now);
      if (!windows) continue;

      let settings = settingsByCompany.get(employee.companyId);
      if (!settings) {
        const row = await this.prisma.timeGateSystemSettings.findUnique({
          where: { companyId: employee.companyId },
          select: { notificationUnclosedReminderDelayMinutes: true },
        });
        settings = {
          notificationUnclosedReminderDelayMinutes:
            row?.notificationUnclosedReminderDelayMinutes ?? 0,
        };
        settingsByCompany.set(employee.companyId, settings);
      }

      const reminderFromMin =
        (windows.checkOutStartMin ?? windows.shiftEndMin) +
        Math.max(0, settings.notificationUnclosedReminderDelayMinutes);
      if (atMin < reminderFromMin) continue;

      const checkIn = await this.prisma.timeGateAttendanceEvent.findFirst({
        where: {
          employeeId: employee.id,
          type: TimeGateAttendanceEventType.CHECK_IN,
          status: {
            in: [
              TimeGateAttendanceEventStatus.ACCEPTED,
              TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
            ],
          },
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (!checkIn) continue;

      const checkOut = await this.prisma.timeGateAttendanceEvent.findFirst({
        where: {
          employeeId: employee.id,
          type: TimeGateAttendanceEventType.CHECK_OUT,
          status: TimeGateAttendanceEventStatus.ACCEPTED,
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (checkOut) continue;

      const employeeName =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
        employee.employeeName;

      try {
        await this.notifications.notifyUnclosedCheckInReminder({
          companyId: employee.companyId,
          employeeId: employee.id,
          employeeName,
          workDate: dayStart,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Checkout reminder failed for ${employee.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} unclosed check-in reminder(s) for ${dayStart.toISOString().slice(0, 10)}`);
    }
  }

  /** Rappel employé : après fin plage pause sans BREAK_END (Lot F #8). */
  @Cron('*/15 * * * *')
  async sendBreakResumeReminders() {
    const now = new Date();
    const atMin = dateToMinutes(now);
    const dayStart = this.startOfDay(now);
    const dayEnd = this.endOfDay(now);

    const employees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      select: { id: true, companyId: true },
    });

    let sent = 0;
    for (const employee of employees) {
      const windows = await this.punchWindows.resolveForEmployee(employee.id, now);
      if (!windows?.breakEndMin || windows.breakStartMin == null) continue;

      const shiftEndMin = windows.checkOutStartMin ?? windows.shiftEndMin;
      if (atMin <= windows.breakEndMin || atMin >= shiftEndMin) continue;

      const todaysEvents = await this.prisma.timeGateAttendanceEvent.findMany({
        where: {
          employeeId: employee.id,
          status: {
            in: [
              TimeGateAttendanceEventStatus.ACCEPTED,
              TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
            ],
          },
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { occurredAt: 'asc' },
        select: { type: true, occurredAt: true },
      });

      const state = buildDayPunchStateFromEvents(todaysEvents);
      if (!state.hasCheckIn || state.hasBreakEnd || state.hasCheckOut) continue;
      if (
        state.checkInAtMin != null &&
        windows.breakEndMin != null &&
        state.checkInAtMin > windows.breakEndMin
      ) {
        continue;
      }

      try {
        await this.notifications.notifyBreakResumeReminder({
          companyId: employee.companyId,
          employeeId: employee.id,
          workDate: dayStart,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Break resume reminder failed for ${employee.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} break resume reminder(s) for ${dayStart.toISOString().slice(0, 10)}`);
    }
  }

  /** 9h : relance managers pour REVIEW_REQUIRED en attente > 24 h (Lot D #13). */
  @Cron('0 9 * * *')
  async sendReviewRequiredManagerReminders() {
    const now = new Date();
    const reminderDate = now.toISOString().slice(0, 10);
    const groups = new Map<string, ReviewReminderGroup>();
    const settingsRows = await this.prisma.timeGateSystemSettings.findMany({
      select: { companyId: true, notificationReviewReminderMinAgeMinutes: true },
    });
    const reviewAgeByCompany = new Map(
      settingsRows.map((row) => [
        row.companyId,
        Math.max(0, row.notificationReviewReminderMinAgeMinutes),
      ]),
    );

    const pendingEvents = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
      },
      select: { id: true, companyId: true, branchId: true, occurredAt: true },
    });

    for (const event of pendingEvents) {
      const minAgeMinutes = reviewAgeByCompany.get(event.companyId);
      const cutoff =
        minAgeMinutes !== undefined
          ? now.getTime() - minAgeMinutes * 60_000
          : now.getTime() - DEFAULT_REVIEW_REMINDER_MIN_AGE_MS;
      if (event.occurredAt.getTime() > cutoff) continue;
      this.addReviewReminderGroup(groups, {
        companyId: event.companyId,
        branchId: event.branchId,
        pendingEventCount: 1,
        pendingDayCount: 0,
      });
    }

    const pendingDays = await this.prisma.timeGateTimesheetDay.findMany({
      where: {
        status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
      },
      select: {
        id: true,
        companyId: true,
        updatedAt: true,
        employee: { select: { branchId: true } },
      },
    });

    for (const day of pendingDays) {
      const minAgeMinutes = reviewAgeByCompany.get(day.companyId);
      const cutoff =
        minAgeMinutes !== undefined
          ? now.getTime() - minAgeMinutes * 60_000
          : now.getTime() - DEFAULT_REVIEW_REMINDER_MIN_AGE_MS;
      if (day.updatedAt.getTime() > cutoff) continue;
      this.addReviewReminderGroup(groups, {
        companyId: day.companyId,
        branchId: day.employee.branchId ?? undefined,
        pendingEventCount: 0,
        pendingDayCount: 1,
      });
    }

    let sent = 0;
    for (const group of groups.values()) {
      const total = group.pendingEventCount + group.pendingDayCount;
      if (total <= 0) continue;
      try {
        await this.notifications.notifyReviewRequiredManagerReminder({
          companyId: group.companyId,
          branchId: group.branchId,
          pendingEventCount: group.pendingEventCount,
          pendingDayCount: group.pendingDayCount,
          reminderDate,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Review reminder failed for ${group.companyId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} REVIEW_REQUIRED manager reminder(s) for ${reminderDate}`);
    }
  }

  /** Kiosks sans heartbeat → OFFLINE (Lot A). */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async markStaleKiosksOffline() {
    const cutoff = new Date(Date.now() - KIOSK_OFFLINE_THRESHOLD_MS);
    const stale = await this.prisma.timeGateKiosk.findMany({
      where: {
        status: KioskStatus.ONLINE,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
      },
      select: {
        id: true,
        kioskName: true,
        companyId: true,
        branchId: true,
      },
    });
    if (stale.length === 0) return;

    await this.prisma.timeGateKiosk.updateMany({
      where: { id: { in: stale.map((k) => k.id) } },
      data: { status: KioskStatus.OFFLINE },
    });

    for (const kiosk of stale) {
      try {
        await this.notifications.notifyKioskOffline({
          companyId: kiosk.companyId,
          branchId: kiosk.branchId,
          kioskId: kiosk.id,
          kioskName: kiosk.kioskName,
        });
      } catch (err) {
        this.logger.warn(
          `Kiosk offline notification failed for ${kiosk.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    this.logger.log(`Marked ${stale.length} kiosk(s) OFFLINE (stale heartbeat)`);
  }

  /** Ops: pics d'échecs de vérification sur kiosque (fenêtre glissante 1h). */
  @Cron(CronExpression.EVERY_HOUR)
  async sendVerifyFailureSpikeAlerts() {
    const to = new Date();
    const from = new Date(to.getTime() - 60 * 60 * 1000);
    const attempts = await this.prisma.timeGatePunchAttemptLog.findMany({
      where: {
        outcome: 'REJECTED',
        occurredAt: { gte: from, lte: to },
        kioskId: { not: null },
      },
      select: {
        companyId: true,
        branchId: true,
        kioskId: true,
      },
    });

    if (attempts.length === 0) return;
    const counts = new Map<
      string,
      { companyId: string; branchId?: string; kioskId: string; rejectedCount: number }
    >();
    for (const attempt of attempts) {
      if (!attempt.kioskId) continue;
      const key = `${attempt.companyId}:${attempt.kioskId}`;
      const prev = counts.get(key);
      if (prev) {
        prev.rejectedCount += 1;
      } else {
        counts.set(key, {
          companyId: attempt.companyId,
          branchId: attempt.branchId ?? undefined,
          kioskId: attempt.kioskId,
          rejectedCount: 1,
        });
      }
    }

    const spikes = [...counts.values()].filter((v) => v.rejectedCount >= 5);
    if (spikes.length === 0) return;

    const kiosks = await this.prisma.timeGateKiosk.findMany({
      where: { id: { in: spikes.map((s) => s.kioskId) } },
      select: { id: true, kioskName: true },
    });
    const kioskNameById = new Map(kiosks.map((k) => [k.id, k.kioskName]));

    let sent = 0;
    for (const spike of spikes) {
      try {
        await this.notifications.notifyVerifyFailureSpike({
          companyId: spike.companyId,
          branchId: spike.branchId,
          kioskId: spike.kioskId,
          kioskName: kioskNameById.get(spike.kioskId) ?? spike.kioskId,
          rejectedCount: spike.rejectedCount,
          fromIso: from.toISOString(),
          toIso: to.toISOString(),
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Verify failure spike notification failed for ${spike.kioskId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} verify-failure spike alert(s).`);
    }
  }

  private addReviewReminderGroup(
    groups: Map<string, ReviewReminderGroup>,
    increment: ReviewReminderGroup,
  ) {
    const branchKey = increment.branchId ?? 'tenant';
    const key = `${increment.companyId}:${branchKey}`;
    const existing = groups.get(key);
    if (existing) {
      existing.pendingEventCount += increment.pendingEventCount;
      existing.pendingDayCount += increment.pendingDayCount;
      return;
    }
    groups.set(key, {
      companyId: increment.companyId,
      branchId: increment.branchId,
      pendingEventCount: increment.pendingEventCount,
      pendingDayCount: increment.pendingDayCount,
    });
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private endOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  }
}
