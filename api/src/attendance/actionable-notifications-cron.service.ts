import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EmployeeStatus,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateClientMissionStatus,
  TimeGatePunchClaimStatus,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import {
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PunchWindowService } from './punch-window.service';

const SHIFT_START_GRACE_MINUTES = 15;

/** O — scans périodiques pour alertes actionnables (pas de vanity). */
@Injectable()
export class ActionableNotificationsCronService {
  private readonly logger = new Logger(ActionableNotificationsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Toutes les 15 min : non-arrivé après début de shift (+ grâce). */
  @Cron('*/15 * * * *')
  async processShiftStartMissing() {
    const now = new Date();
    const employees = await this.prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        company: { select: { timeZone: true } },
      },
    });

    let sent = 0;
    for (const employee of employees) {
      const timeZone = resolveOrgTimeZone(employee.company?.timeZone);
      const dateKey = dateKeyInTimeZone(now, timeZone);
      const atMin = dateToMinutesInTimeZone(now, timeZone);
      const bounds = dayBoundsForDateKeyInTimeZone(dateKey, timeZone);
      const windows = await this.punchWindows.resolveForEmployee(employee.id, now);
      if (!windows) continue;

      const alertAfter = windows.shiftStartMin + SHIFT_START_GRACE_MINUTES;
      if (atMin < alertAfter || atMin >= windows.checkInEndMin) continue;

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
          occurredAt: { gte: bounds.start, lte: bounds.end },
        },
        select: { id: true },
      });
      if (checkIn) continue;

      const name =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
        employee.employeeName;
      try {
        await this.notifications.notifyShiftStartMissing({
          companyId: employee.companyId,
          branchId: employee.branchId ?? undefined,
          employeeId: employee.id,
          employeeName: name,
          workDate: dateKey,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `SHIFT_START_MISSING failed ${employee.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (sent > 0) this.logger.log(`SHIFT_START_MISSING: ${sent} alert(s)`);
  }

  /** Quotidien 08h : affectations qui expirent sous 7 jours. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processAssignmentExpiring() {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const horizonKey = horizon.toISOString().slice(0, 10);

    const rows = await this.prisma.shiftAssignment.findMany({
      where: {
        endDate: {
          not: null,
          gte: new Date(`${todayKey}T00:00:00.000Z`),
          lte: new Date(`${horizonKey}T00:00:00.000Z`),
        },
        employee: { status: EmployeeStatus.ACTIVE },
      },
      select: {
        id: true,
        companyId: true,
        endDate: true,
        employeeId: true,
        employee: {
          select: {
            branchId: true,
            employeeName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    let sent = 0;
    for (const row of rows) {
      if (!row.companyId || !row.endDate) continue;
      const endDate = row.endDate.toISOString().slice(0, 10);
      const name =
        `${row.employee.firstName ?? ''} ${row.employee.lastName ?? ''}`.trim() ||
        row.employee.employeeName;
      try {
        await this.notifications.notifyAssignmentExpiring({
          companyId: row.companyId,
          branchId: row.employee.branchId ?? undefined,
          employeeId: row.employeeId,
          employeeName: name,
          assignmentId: row.id,
          endDate,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `ASSIGNMENT_EXPIRING failed ${row.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (sent > 0) this.logger.log(`ASSIGNMENT_EXPIRING: ${sent} alert(s)`);
  }

  /** Toutes les heures : mission client ACTIVE sans pointage du jour sur le lieu. */
  @Cron(CronExpression.EVERY_HOUR)
  async processMissionNoPunch() {
    const now = new Date();
    const missions = await this.prisma.timeGateClientMission.findMany({
      where: { status: TimeGateClientMissionStatus.ACTIVE },
      select: {
        id: true,
        title: true,
        companyId: true,
        branchId: true,
        locationId: true,
        location: { select: { name: true } },
        company: { select: { timeZone: true } },
      },
    });

    let sent = 0;
    for (const mission of missions) {
      const timeZone = resolveOrgTimeZone(mission.company?.timeZone);
      const dateKey = dateKeyInTimeZone(now, timeZone);
      const atMin = dateToMinutesInTimeZone(now, timeZone);
      if (atMin < 10 * 60) continue;
      const bounds = dayBoundsForDateKeyInTimeZone(dateKey, timeZone);

      const punchCount = await this.prisma.timeGateAttendanceEvent.count({
        where: {
          companyId: mission.companyId,
          occurredAt: { gte: bounds.start, lte: bounds.end },
          status: {
            in: [
              TimeGateAttendanceEventStatus.ACCEPTED,
              TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
            ],
          },
          kiosk: { locationId: mission.locationId },
        },
      });
      if (punchCount > 0) continue;

      try {
        await this.notifications.notifyMissionNoPunch({
          companyId: mission.companyId,
          branchId: mission.branchId,
          missionId: mission.id,
          missionTitle: mission.title,
          locationName: mission.location?.name ?? 'Lieu',
          workDate: dateKey,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `MISSION_NO_PUNCH failed ${mission.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (sent > 0) this.logger.log(`MISSION_NO_PUNCH: ${sent} alert(s)`);
  }

  /** Quotidien 08h : anomalies ouvertes si paie due / cycle du mois en cours. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processAnomalyBeforePayroll() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const companies = await this.prisma.company.findMany({
      where: {
        OR: [
          {
            timeGatePayrollRuns: {
              some: {
                status: { not: 'DRAFT' },
                year,
                month,
              },
            },
          },
          {
            timeGatePayrollRuns: {
              some: {
                status: { not: 'DRAFT' },
                lines: {
                  some: {
                    paymentStatus: 'UNPAID',
                    dueDate: {
                      not: null,
                      lte: new Date(now.getTime() + 7 * 86400000),
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true, timeZone: true },
    });

    for (const company of companies) {
      const timeZone = resolveOrgTimeZone(company.timeZone);
      const dayKey = dateKeyInTimeZone(now, timeZone);
      const [events, claims, days] = await Promise.all([
        this.prisma.timeGateAttendanceEvent.count({
          where: {
            companyId: company.id,
            status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
          },
        }),
        this.prisma.timeGatePunchClaim.count({
          where: {
            companyId: company.id,
            status: TimeGatePunchClaimStatus.OPEN,
          },
        }),
        this.prisma.timeGateTimesheetDay.count({
          where: {
            companyId: company.id,
            status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          },
        }),
      ]);
      const openCount = events + claims + days;
      if (openCount === 0) continue;
      try {
        await this.notifications.notifyAnomalyBeforePayroll({
          companyId: company.id,
          openCount,
          dayKey,
        });
      } catch (err) {
        this.logger.warn(
          `ANOMALY_BEFORE_PAYROLL failed ${company.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
