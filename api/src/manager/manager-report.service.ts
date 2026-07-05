import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  AttendanceStatus,
  LeaveApplicationStatus,
  TimeGateAttendanceEventStatus,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { MailService } from '../auth/mail.service';
import { NotificationRecipientResolver } from '../notifications/notification-recipient.resolver';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatFrDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

  /** Lundi 7h — rapport anomalies de la semaine précédente (lun–dim). */
  @Cron('0 7 * * 1')
  async sendWeeklyAnomalyReports() {
    const today = startOfDay(new Date());
    const periodEnd = new Date(today);
    periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 6);

    const fromIso = periodStart.toISOString().slice(0, 10);
    const toIso = periodEnd.toISOString().slice(0, 10);
    const periodLabel = `${formatFrDate(fromIso)} – ${formatFrDate(toIso)}`;

    const companies = await this.prisma.company.findMany({
      select: { id: true, name: true },
    });

    let sent = 0;
    for (const company of companies) {
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
      this.logger.log(`Sent ${sent} weekly anomaly report(s) for ${periodLabel}`);
    }
  }

  async getWeeklyAnomalyStats(companyId: string, from: Date, to: Date) {
    const toEnd = new Date(to);
    toEnd.setUTCHours(23, 59, 59, 999);

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
          occurredAt: { gte: from, lte: toEnd },
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
          createdAt: { gte: from, lte: toEnd },
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
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
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
