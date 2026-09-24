import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeGateLocationType } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { AuditTrailService } from '../audit/audit-trail.service';
import { SubscriptionQuotaService } from '../saas/subscription-quota.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotas: SubscriptionQuotaService,
    private readonly audit: AuditTrailService,
  ) {}

  async create(dto: CreateLocationDto, companyId: string) {
    await this.quotas.assertCanAddLocation(companyId);
    if (dto.type === TimeGateLocationType.BRANCH_SITE && !dto.branchId) {
      throw new BadRequestException('branchId is required for BRANCH_SITE locations');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch || branch.companyId !== companyId) {
        throw new NotFoundException('Branch not found');
      }
      const existing = await this.prisma.timeGateLocation.findUnique({
        where: { branchId: dto.branchId },
      });
      if (existing) {
        throw new BadRequestException('Cette branche a deja un lieu de pointage');
      }
    }

    const created = await this.prisma.timeGateLocation.create({
      data: {
        id: generateDocId('LOC'),
        companyId,
        name: dto.name.trim(),
        type: dto.type ?? TimeGateLocationType.CLIENT_SITE,
        branchId: dto.branchId ?? null,
        timeZone: dto.timeZone ?? null,
        address: dto.address ?? null,
        clientLabel: dto.clientLabel ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        checkinRadius: dto.checkinRadius ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.toApiShape(created);
  }

  /** Ensure a BRANCH_SITE location exists for a branch (signup / branch create). */
  async ensureBranchSiteLocation(params: {
    companyId: string;
    branchId: string;
    name: string;
    timeZone?: string | null;
    address?: string | null;
    latitude?: Prisma.Decimal | number | null;
    longitude?: Prisma.Decimal | number | null;
    checkinRadius?: number | null;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.timeGateLocation.findUnique({
      where: { branchId: params.branchId },
    });
    if (existing) return existing;

    return this.prisma.timeGateLocation.create({
      data: {
        id: generateDocId('LOC'),
        companyId: params.companyId,
        name: params.name,
        type: TimeGateLocationType.BRANCH_SITE,
        branchId: params.branchId,
        timeZone: params.timeZone ?? null,
        address: params.address ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        checkinRadius: params.checkinRadius ?? null,
        isActive: params.isActive ?? true,
      },
    });
  }

  async findAll(query: LocationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TimeGateLocationWhereInput = {
      ...(user.role === PLATFORM_ADMIN ? {} : { companyId: user.companyId ?? undefined }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.timeGateLocation.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.timeGateLocation.count({ where }),
    ]);
    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Location not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateLocationDto, user: JwtUser) {
    const row = await this.prisma.timeGateLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Location not found');
    this.assertCompanyAccess(user, row.companyId);

    if (dto.isActive === false && row.isActive) {
      return this.archive(id, { reason: 'Désactivé via modification' }, user);
    }

    const updated = await this.prisma.timeGateLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
        ...(dto.clientLabel !== undefined ? { clientLabel: dto.clientLabel || null } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.checkinRadius !== undefined ? { checkinRadius: dto.checkinRadius } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.toApiShape(updated);
  }

  /**
   * Archive a location: isActive=false, deactivate kiosks, close open assignments.
   * Does not delete history / employees.
   */
  async archive(
    id: string,
    dto: { reason?: string },
    user: JwtUser,
  ) {
    const row = await this.prisma.timeGateLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Location not found');
    this.assertCompanyAccess(user, row.companyId);
    if (!row.isActive) {
      return this.toApiShape(row);
    }

    const today = new Date();
    const endDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.timeGateLocation.update({
        where: { id },
        data: { isActive: false },
      });

      const kiosks = await tx.timeGateKiosk.updateMany({
        where: { locationId: id, isActive: true },
        data: { isActive: false },
      });

      const openAssignments = await tx.shiftAssignment.findMany({
        where: {
          locationId: id,
          OR: [{ endDate: null }, { endDate: { gte: endDate } }],
        },
        select: { id: true, endDate: true },
      });
      for (const asn of openAssignments) {
        await tx.shiftAssignment.update({
          where: { id: asn.id },
          data: { endDate },
        });
      }

      return {
        updated,
        kiosksDeactivated: kiosks.count,
        assignmentsClosed: openAssignments.length,
      };
    });

    await this.audit.record({
      userId: user.sub,
      companyId: row.companyId,
      branchId: row.branchId,
      action: 'LOCATION_ARCHIVE',
      entity: 'TimeGateLocation',
      entityId: id,
      reason: dto.reason ?? null,
      before: { isActive: true },
      after: {
        isActive: false,
        kiosksDeactivated: result.kiosksDeactivated,
        assignmentsClosed: result.assignmentsClosed,
        assignmentEndDate: endDate.toISOString().slice(0, 10),
      },
    });

    return this.toApiShape(result.updated);
  }

  /** Restore archived location (kiosks stay off — reactivate explicitly). */
  async restore(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Location not found');
    this.assertCompanyAccess(user, row.companyId);
    if (row.isActive) {
      return this.toApiShape(row);
    }

    await this.quotas.assertCanAddLocation(row.companyId);

    const updated = await this.prisma.timeGateLocation.update({
      where: { id },
      data: { isActive: true },
    });

    await this.audit.record({
      userId: user.sub,
      companyId: row.companyId,
      branchId: row.branchId,
      action: 'LOCATION_RESTORE',
      entity: 'TimeGateLocation',
      entityId: id,
      before: { isActive: false },
      after: { isActive: true },
    });

    return this.toApiShape(updated);
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access denied');
    }
  }

  private toApiShape(row: {
    id: string;
    companyId: string;
    name: string;
    type: TimeGateLocationType;
    isActive: boolean;
    branchId: string | null;
    timeZone: string | null;
    address: string | null;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    checkinRadius: number | null;
    clientLabel: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      type: row.type,
      isActive: row.isActive,
      branchId: row.branchId,
      timeZone: row.timeZone,
      address: row.address,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      checkinRadius: row.checkinRadius,
      clientLabel: row.clientLabel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
