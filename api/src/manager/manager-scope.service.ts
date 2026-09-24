import { Injectable } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyCapabilitiesService } from '../saas/company-capabilities.service';

export type ManagerLocationScope = {
  /** True when MANAGER + capability scoped_managers — filter applies. */
  scoped: boolean;
  locationIds: string[] | null;
  branchIds: string[] | null;
};

@Injectable()
export class ManagerScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilities: CompanyCapabilitiesService,
  ) {}

  async resolve(user: JwtUser): Promise<ManagerLocationScope> {
    if (
      user.role === PLATFORM_ADMIN ||
      user.role === TimeGateUserRole.ADMIN ||
      !user.companyId
    ) {
      return { scoped: false, locationIds: null, branchIds: null };
    }
    if (user.role !== TimeGateUserRole.MANAGER) {
      return { scoped: false, locationIds: null, branchIds: null };
    }

    const enabled = await this.capabilities.hasCapability(
      user.companyId,
      'scoped_managers',
    );
    if (!enabled) {
      return { scoped: false, locationIds: null, branchIds: null };
    }

    const rows = await this.prisma.timeGateUserLocation.findMany({
      where: { userId: user.sub },
      select: {
        locationId: true,
        location: { select: { branchId: true } },
      },
    });

    const locationIds = rows.map((r) => r.locationId);
    const branchIds = [
      ...new Set(
        rows
          .map((r) => r.location.branchId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    return { scoped: true, locationIds, branchIds };
  }

  /** Prisma filter for Employee — empty scope → impossible match. */
  employeeWhere(scope: ManagerLocationScope): Prisma.EmployeeWhereInput | undefined {
    if (!scope.scoped) return undefined;
    const locationIds = scope.locationIds ?? [];
    const branchIds = scope.branchIds ?? [];
    if (locationIds.length === 0) {
      return { id: { in: [] } };
    }
    const or: Prisma.EmployeeWhereInput[] = [
      { homeLocationId: { in: locationIds } },
      {
        shiftAssignments: {
          some: { locationId: { in: locationIds } },
        },
      },
    ];
    if (branchIds.length > 0) {
      or.push({ branchId: { in: branchIds } });
    }
    return { OR: or };
  }

  /** Keep only location stats / sites the manager owns. */
  filterLocationIds(scope: ManagerLocationScope, locationId: string | null): boolean {
    if (!scope.scoped) return true;
    if (locationId == null) return false;
    return (scope.locationIds ?? []).includes(locationId);
  }
}
