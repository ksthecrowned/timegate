import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmployeeStatus } from '@prisma/client';
import {
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { LeaveBalancesService } from './leave-balances.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const LOW_BALANCE_THRESHOLD_DAYS = 2;

@Injectable()
export class LeaveBalanceCronService {
  private readonly logger = new Logger(LeaveBalanceCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: LeaveBalancesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Hourly sweep; actual send is gated at 08:00 local company time. */
  @Cron(CronExpression.EVERY_HOUR)
  async sendLowBalanceAlerts() {
    const now = new Date();
    const companies = await this.prisma.company.findMany({
      select: { id: true, timeZone: true },
    });
    const dueCompanies = companies.filter((company) => {
      const timeZone = resolveOrgTimeZone(company.timeZone);
      return Math.floor(dateToMinutesInTimeZone(now, timeZone) / 60) === 8;
    });
    if (dueCompanies.length === 0) return;

    const dueCompanyIds = new Set(dueCompanies.map((c) => c.id));
    const timeZoneByCompany = new Map(
      dueCompanies.map((c) => [c.id, resolveOrgTimeZone(c.timeZone)]),
    );
    const years = [
      ...new Set(
        dueCompanies.map((c) =>
          Number(dateKeyInTimeZone(now, resolveOrgTimeZone(c.timeZone)).slice(0, 4)),
        ),
      ),
    ];

    const allocations = await this.prisma.leaveAllocation.findMany({
      where: {
        year: { in: years },
        employee: {
          status: EmployeeStatus.ACTIVE,
          companyId: { in: [...dueCompanyIds] },
        },
      },
      select: {
        year: true,
        employeeId: true,
        leaveTypeId: true,
        employee: {
          select: {
            id: true,
            companyId: true,
            branchId: true,
            employeeName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    let sent = 0;
    for (const allocation of allocations) {
      const timeZone = timeZoneByCompany.get(allocation.employee.companyId);
      if (!timeZone) continue;
      const dayKey = dateKeyInTimeZone(now, timeZone);
      const year = Number(dayKey.slice(0, 4));
      if (allocation.year !== year) continue;

      const balance = await this.balances.getBalance(
        allocation.employeeId,
        allocation.leaveTypeId,
        year,
      );
      if (balance.unlimited || balance.remaining == null) continue;
      if (balance.remaining > LOW_BALANCE_THRESHOLD_DAYS) continue;

      const employeeName =
        `${allocation.employee.firstName ?? ''} ${allocation.employee.lastName ?? ''}`.trim() ||
        allocation.employee.employeeName;
      try {
        await this.notifications.notifyLeaveBalanceLow({
          companyId: allocation.employee.companyId,
          branchId: allocation.employee.branchId ?? undefined,
          employeeId: allocation.employee.id,
          employeeName,
          leaveTypeName: balance.leaveTypeName,
          year,
          remainingDays: balance.remaining,
          dedupeDayKey: dayKey,
        });
        sent += 1;
      } catch (err) {
        this.logger.warn(
          `Low leave balance notification failed for ${allocation.employeeId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} low leave balance alert(s).`);
    }
  }
}
