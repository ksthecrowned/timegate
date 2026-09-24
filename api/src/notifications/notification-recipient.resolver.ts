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

  /** Managers de branche / lieux ∪ tous MANAGER/ADMIN actifs du tenant. */
  async resolveManagers(companyId: string, branchId?: string): Promise<string[]> {
    const tenantManagers = await this.prisma.user.findMany({
      where: {
        companyId,
        enabled: true,
        timeGateRole: { in: [TimeGateUserRole.MANAGER, TimeGateUserRole.ADMIN] },
      },
      select: { id: true, timeGateRole: true },
    });

    const admins = tenantManagers
      .filter((u) => u.timeGateRole === TimeGateUserRole.ADMIN)
      .map((u) => u.id);
    const managerIds = tenantManagers
      .filter((u) => u.timeGateRole === TimeGateUserRole.MANAGER)
      .map((u) => u.id);

    const ids = new Set<string>(admins);

    if (!branchId) {
      for (const id of managerIds) ids.add(id);
      return [...ids];
    }

    const location = await this.prisma.timeGateLocation.findUnique({
      where: { branchId },
      select: { id: true },
    });

    const [branchScoped, locationScoped, unscopedManagers] = await Promise.all([
      this.prisma.timeGateUserBranch.findMany({
        where: {
          branchId,
          userId: { in: managerIds },
        },
        select: { userId: true },
      }),
      location
        ? this.prisma.timeGateUserLocation.findMany({
            where: {
              locationId: location.id,
              userId: { in: managerIds },
            },
            select: { userId: true },
          })
        : Promise.resolve([] as Array<{ userId: string }>),
      this.prisma.user.findMany({
        where: {
          id: { in: managerIds },
          managedLocations: { none: {} },
          branches: { none: {} },
        },
        select: { id: true },
      }),
    ]);

    for (const row of branchScoped) ids.add(row.userId);
    for (const row of locationScoped) ids.add(row.userId);
    // Managers without any scope still get tenant-wide alerts (capability off / not assigned)
    for (const row of unscopedManagers) ids.add(row.id);

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
