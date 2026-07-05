import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmployeeStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

function isoWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

@Injectable()
export class EmployeeContractCronService {
  private readonly logger = new Logger(EmployeeContractCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyHrChecks() {
    const now = new Date();
    await this.sendContractExpiryAlerts(now);
    await this.sendMissingContractDocumentAlerts(now);
  }

  private async sendContractExpiryAlerts(now: Date) {
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const contracts = await this.prisma.timeGateEmployeeContract.findMany({
      where: {
        isCurrent: true,
        expiresAt: { not: null, lte: horizon },
        employee: { status: EmployeeStatus.ACTIVE },
      },
      select: {
        id: true,
        companyId: true,
        employeeId: true,
        expiresAt: true,
        employee: { select: { employeeName: true, branchId: true } },
      },
    });

    const checkpoints = new Set([30, 7, 1, 0]);
    for (const contract of contracts) {
      if (!contract.expiresAt) continue;
      const daysLeft = Math.ceil(
        (contract.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (!checkpoints.has(daysLeft)) continue;
      await this.notifications.notifyHrContractExpiring({
        companyId: contract.companyId,
        branchId: contract.employee.branchId ?? undefined,
        employeeId: contract.employeeId,
        employeeName: contract.employee.employeeName,
        contractId: contract.id,
        expiresAtIso: contract.expiresAt.toISOString().slice(0, 10),
        daysLeft,
      });
    }

    if (contracts.length > 0) {
      this.logger.log(`HR contract checks completed (${contracts.length} contract(s) scanned)`);
    }
  }

  private async sendMissingContractDocumentAlerts(now: Date) {
    const weekKey = isoWeekKey(now);
    const staleSignedBefore = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const missingDocs = await this.prisma.timeGateEmployeeContract.findMany({
      where: {
        isCurrent: true,
        contractFileUrl: null,
        signedAt: { lte: staleSignedBefore },
        employee: { status: EmployeeStatus.ACTIVE },
      },
      select: {
        id: true,
        companyId: true,
        employeeId: true,
        signedAt: true,
        employee: { select: { employeeName: true, branchId: true } },
      },
    });

    for (const contract of missingDocs) {
      await this.notifications.notifyHrMissingDocument({
        companyId: contract.companyId,
        branchId: contract.employee.branchId ?? undefined,
        employeeId: contract.employeeId,
        employeeName: contract.employee.employeeName,
        contractId: contract.id,
        signedAtIso: contract.signedAt.toISOString().slice(0, 10),
        weekKey,
      });
    }
    if (missingDocs.length > 0) {
      this.logger.log(
        `HR missing document checks completed (${missingDocs.length} contract(s) scanned)`,
      );
    }
  }
}
