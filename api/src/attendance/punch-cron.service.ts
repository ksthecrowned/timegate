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
import { PunchWindowService } from './punch-window.service';
import { NotificationsService } from '../notifications/notifications.service';

const KIOSK_OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;

@Injectable()
export class PunchCronService {
  private readonly logger = new Logger(PunchCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly notifications: NotificationsService,
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
      select: { id: true, companyId: true, employeeName: true, firstName: true, lastName: true, branchId: true },
    });

    let marked = 0;
    for (const employee of employees) {
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
    for (const employee of employees) {
      const windows = await this.punchWindows.resolveForEmployee(employee.id, now);
      if (!windows) continue;

      const reminderFromMin = windows.checkOutStartMin ?? windows.shiftEndMin;
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

  /** Kiosks sans heartbeat → OFFLINE (Lot A). */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async markStaleKiosksOffline() {
    const cutoff = new Date(Date.now() - KIOSK_OFFLINE_THRESHOLD_MS);
    const result = await this.prisma.timeGateKiosk.updateMany({
      where: {
        status: KioskStatus.ONLINE,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
      },
      data: { status: KioskStatus.OFFLINE },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} kiosk(s) OFFLINE (stale heartbeat)`);
    }
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private endOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
  }
}
