import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmployeeStatus } from '@prisma/client';
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

  /** RH ops: alerte solde congé faible (quotidien 8h). */
  @Cron('0 8 * * *')
  async sendLowBalanceAlerts() {
    const year = new Date().getUTCFullYear();
    const dedupeDayKey = new Date().toISOString().slice(0, 10);
    const allocations = await this.prisma.leaveAllocation.findMany({
      where: {
        year,
        employee: { status: EmployeeStatus.ACTIVE },
      },
      select: {
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
      const balance = await this.balances.getBalance(allocation.employeeId, allocation.leaveTypeId, year);
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
          dedupeDayKey,
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
