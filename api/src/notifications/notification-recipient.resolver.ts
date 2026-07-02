import { Injectable } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationRecipientResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveEmployeeUserId(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    return employee?.userId ?? null;
  }

  /** Managers de branche ∪ tous MANAGER/ADMIN actifs du tenant. */
  async resolveManagers(companyId: string, branchId?: string): Promise<string[]> {
    const tenantManagers = await this.prisma.user.findMany({
      where: {
        companyId,
        enabled: true,
        timeGateRole: { in: [TimeGateUserRole.MANAGER, TimeGateUserRole.ADMIN] },
      },
      select: { id: true },
    });

    const ids = new Set(tenantManagers.map((user) => user.id));

    if (branchId) {
      const branchScoped = await this.prisma.timeGateUserBranch.findMany({
        where: {
          branchId,
          user: {
            companyId,
            enabled: true,
            timeGateRole: TimeGateUserRole.MANAGER,
          },
        },
        select: { userId: true },
      });
      for (const row of branchScoped) {
        ids.add(row.userId);
      }
    }

    return [...ids];
  }

  async resolveManagerEmails(companyId: string, branchId?: string): Promise<string[]> {
    const userIds = await this.resolveManagers(companyId, branchId);
    if (userIds.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, enabled: true },
      select: { email: true },
    });
    return [...new Set(users.map((u) => u.email.trim().toLowerCase()).filter(Boolean))];
  }
}
