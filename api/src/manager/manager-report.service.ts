import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  AttendanceStatus,
  LeaveApplicationStatus,
  TimeGateAttendanceEventStatus,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { MailService } from '../auth/mail.service';
import {
  dateKeyAddDays,
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { NotificationRecipientResolver } from '../notifications/notification-recipient.resolver';
import { PrismaService } from '../prisma/prisma.service';

function formatFrDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Monday=0 … Sunday=6 from Intl weekday short names. */
function weekdayIndexInTimeZone(at: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(at);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[weekday] ?? 0;
}

@Injectable()
export class ManagerReportService {
  private readonly logger = new Logger(ManagerReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly recipients: NotificationRecipientResolver,
    private readonly config: ConfigService,
  ) {}

  /** Hourly sweep; Monday 07:00 local company time — previous Mon–Sun anomalies. */
  @Cron(CronExpression.EVERY_HOUR)
  async sendWeeklyAnomalyReports() {
    const now = new Date();
    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true, timeZone: true },
    });

    let sent = 0;
    for (const company of companies) {
      const timeZone = resolveOrgTimeZone(company.timeZone);
      const hourLocal = Math.floor(dateToMinutesInTimeZone(now, timeZone) / 60);
      if (hourLocal !== 7) continue;
      if (weekdayIndexInTimeZone(now, timeZone) !== 0) continue;

      const todayKey = dateKeyInTimeZone(now, timeZone);
      const toIso = dateKeyAddDays(todayKey, -1);
      const fromIso = dateKeyAddDays(toIso, -6);
      const periodLabel = `${formatFrDate(fromIso)} – ${formatFrDate(toIso)}`;
      const periodStart = new Date(`${fromIso}T00:00:00.000Z`);
      const periodEnd = new Date(`${toIso}T00:00:00.000Z`);

      try {
        const stats = await this.getWeeklyAnomalyStats(company.id, periodStart, periodEnd);
        if (stats.total === 0) continue;

        const emails = await this.recipients.resolveManagerEmails(company.id);
        if (emails.length === 0) continue;

        const dashboardBase =
          this.config.get<string>('DASHBOARD_URL')?.replace(/\/$/, '') ?? '';
        const dashboardUrl = dashboardBase ? `${dashboardBase}/manager/inbox` : undefined;

        await this.mail.sendWeeklyAnomalyReport({
          to: emails,
          companyName: company.name ?? 'Organisation',
          periodLabel,
          lines: stats.lines,
          dashboardUrl,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Weekly report failed for ${company.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} weekly anomaly report(s)`);
    }
  }

  async getWeeklyAnomalyStats(companyId: string, from: Date, to: Date) {
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timeZone: true },
    });
    const timeZone = resolveOrgTimeZone(company?.timeZone);
    const fromBounds = dayBoundsForDateKeyInTimeZone(fromIso, timeZone);
    const toBounds = dayBoundsForDateKeyInTimeZone(toIso, timeZone);

    const [
      pendingReviews,
      reviewEventsInPeriod,
      unclosedDays,
      lateRecords,
      absences,
      pendingLeaves,
    ] = await Promise.all([
      this.prisma.timeGateAttendanceEvent.count({
        where: {
          companyId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
        },
      }),
      this.prisma.timeGateAttendanceEvent.count({
        where: {
          companyId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
          occurredAt: { gte: fromBounds.start, lte: toBounds.end },
        },
      }),
      this.prisma.timeGateTimesheetDay.count({
        where: {
          companyId,
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          workDate: { gte: from, lte: to },
        },
      }),
      this.prisma.timeGateLateRecord.count({
        where: {
          companyId,
          createdAt: { gte: fromBounds.start, lte: toBounds.end },
        },
      }),
      this.prisma.attendance.count({
        where: {
          companyId,
          status: AttendanceStatus.ABSENT,
          attendanceDate: { gte: from, lte: to },
        },
      }),
      this.prisma.leaveApplication.count({
        where: {
          companyId,
          status: LeaveApplicationStatus.OPEN,
        },
      }),
    ]);

    const lines: string[] = [];
    if (pendingReviews > 0) {
      lines.push(`${pendingReviews} pointage(s) encore en attente de validation`);
    }
    if (reviewEventsInPeriod > 0) {
      lines.push(`${reviewEventsInPeriod} pointage(s) à valider sur la période`);
    }
    if (unclosedDays > 0) {
      lines.push(`${unclosedDays} journée(s) avec check-out oublié`);
    }
    if (lateRecords > 0) {
      lines.push(`${lateRecords} retard(s) enregistré(s)`);
    }
    if (absences > 0) {
      lines.push(`${absences} absence(s) sur la période`);
    }
    if (pendingLeaves > 0) {
      lines.push(`${pendingLeaves} demande(s) de congé en attente (actuel)`);
    }

    return {
      from: fromIso,
      to: toIso,
      total: lines.length,
      lines,
      counts: {
        pendingReviews,
        reviewEventsInPeriod,
        unclosedDays,
        lateRecords,
        absences,
        pendingLeaves,
      },
    };
  }
}
