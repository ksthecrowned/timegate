import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Injectable()
export class AdminSaasService {
  constructor(private prisma: PrismaService) {}

  async findSystemConfigs(query: PaginationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGateSystemSettingsWhereInput = companyId
      ? { companyId }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.timeGateSystemSettings.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: { select: { id: true, name: true, sku: true } },
          defaultShiftType: { select: { id: true, shiftName: true } },
        },
      }),
      this.prisma.timeGateSystemSettings.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toSystemConfigShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTenantConfig(user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const row = await this.ensureTenantConfig(companyId);
    return this.toSystemConfigShape(row);
  }

  async updateTenantConfig(user: JwtUser, dto: UpdateSystemConfigDto) {
    const companyId = this.requireCompanyId(user);
    const row = await this.ensureTenantConfig(companyId);
    await this.validateDefaultShiftType(companyId, dto.defaultShiftTypeId);
    const updated = await this.prisma.timeGateSystemSettings.update({
      where: { id: row.id },
      data: this.buildSystemConfigUpdate(dto),
      include: {
        company: { select: { id: true, name: true, sku: true } },
        defaultShiftType: { select: { id: true, shiftName: true } },
      },
    });
    return this.toSystemConfigShape(updated);
  }

  async updateSystemConfig(id: string, dto: UpdateSystemConfigDto, user: JwtUser) {
    const row = await this.prisma.timeGateSystemSettings.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('System config not found');
    this.assertCompanyAccess(user, row.companyId);
    await this.validateDefaultShiftType(row.companyId, dto.defaultShiftTypeId);
    const updated = await this.prisma.timeGateSystemSettings.update({
      where: { id },
      data: this.buildSystemConfigUpdate(dto),
      include: {
        company: { select: { id: true, name: true, sku: true } },
        defaultShiftType: { select: { id: true, shiftName: true } },
      },
    });
    return this.toSystemConfigShape(updated);
  }

  async findSubscriptions(query: PaginationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGateSubscriptionWhereInput = companyId
      ? { companyId }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.timeGateSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { company: { select: { id: true, name: true, sku: true } } },
      }),
      this.prisma.timeGateSubscription.count({ where }),
    ]);

    return {
      data: items.map((row) => ({
        id: row.id,
        companyId: row.companyId,
        plan: row.plan,
        maxEmployees: row.maxEmployees,
        maxKiosks: row.maxKiosks,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        company: row.company
          ? { id: row.company.id, name: row.company.name ?? row.company.id, sku: row.company.sku ?? '' }
          : undefined,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPlatformStats() {
    const now = new Date();
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 30);

    const companies = await this.prisma.company.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        _count: {
          select: {
            employees: true,
            branches: true,
            kiosks: true,
          },
        },
        timeGateSubscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { expiresAt: true, plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [totalAttendanceEvents, activeSubscriptions] = await Promise.all([
      this.prisma.timeGateAttendanceEvent.count({
        where: { createdAt: { gte: from } },
      }),
      this.prisma.timeGateSubscription.count({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
    ]);

    const expiredSubscriptions = await this.prisma.timeGateSubscription.count({
      where: { expiresAt: { lte: now } },
    });

    return {
      summary: {
        organizationCount: companies.length,
        activeSubscriptions,
        expiredSubscriptions,
        attendanceEventsLast30Days: totalAttendanceEvents,
      },
      organizations: companies.map((row) => {
        const sub = row.timeGateSubscriptions[0];
        const isActive = !sub?.expiresAt || sub.expiresAt > now;
        return {
          companyId: row.id,
          name: row.name ?? row.id,
          sku: row.sku ?? '',
          employeeCount: row._count.employees,
          branchCount: row._count.branches,
          kioskCount: row._count.kiosks,
          subscriptionPlan: sub?.plan ?? null,
          subscriptionActive: isActive,
        };
      }),
    };
  }

  async findAuditLogs(query: PaginationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGateAuditLogWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, timeGateRole: true } },
          company: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.timeGateAuditLog.count({ where }),
    ]);

    return {
      data: items.map((row) => ({
        id: row.id,
        companyId: row.companyId,
        userId: row.userId,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
        user: row.user
          ? { id: row.user.id, email: row.user.email, role: row.user.timeGateRole }
          : null,
        company: row.company
          ? { id: row.company.id, name: row.company.name ?? row.company.id, sku: row.company.sku ?? '' }
          : undefined,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private requireCompanyId(user: JwtUser): string {
    if (!user.companyId) {
      throw new ForbiddenException('Company context is required');
    }
    return user.companyId;
  }

  private async ensureTenantConfig(companyId: string) {
    const existing = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      include: {
        company: { select: { id: true, name: true, sku: true } },
        defaultShiftType: { select: { id: true, shiftName: true } },
      },
    });
    if (existing) return existing;

    return this.prisma.timeGateSystemSettings.create({
      data: {
        id: generateDocId('CFG'),
        companyId,
      },
      include: {
        company: { select: { id: true, name: true, sku: true } },
        defaultShiftType: { select: { id: true, shiftName: true } },
      },
    });
  }

  private async validateDefaultShiftType(
    companyId: string,
    defaultShiftTypeId?: string | null,
  ) {
    if (defaultShiftTypeId === undefined) return;
    if (!defaultShiftTypeId) return;
    const shift = await this.prisma.shiftType.findUnique({
      where: { id: defaultShiftTypeId },
      select: { companyId: true },
    });
    if (!shift || shift.companyId !== companyId) {
      throw new BadRequestException('Invalid default shift type for this organization');
    }
  }

  private buildSystemConfigUpdate(dto: UpdateSystemConfigDto): Prisma.TimeGateSystemSettingsUpdateInput {
    return {
      ...(dto.minConfidence !== undefined ? { minConfidence: dto.minConfidence } : {}),
      ...(dto.lateThreshold !== undefined ? { lateThreshold: dto.lateThreshold } : {}),
      ...(dto.veryLateThreshold !== undefined
        ? { veryLateThreshold: dto.veryLateThreshold }
        : {}),
      ...(dto.defaultShiftTypeId !== undefined
        ? { defaultShiftTypeId: dto.defaultShiftTypeId || null }
        : {}),
      ...(dto.pinFailureThreshold !== undefined
        ? { pinFailureThreshold: dto.pinFailureThreshold }
        : {}),
      ...(dto.pinFailureCooldownSeconds !== undefined
        ? { pinFailureCooldownSeconds: dto.pinFailureCooldownSeconds }
        : {}),
      ...(dto.timesheetRoundingMinutes !== undefined
        ? { timesheetRoundingMinutes: dto.timesheetRoundingMinutes }
        : {}),
      ...(dto.overtimeAlertThresholdMinutes !== undefined
        ? { overtimeAlertThresholdMinutes: dto.overtimeAlertThresholdMinutes }
        : {}),
      ...(dto.minMinutesBetweenShifts !== undefined
        ? { minMinutesBetweenShifts: dto.minMinutesBetweenShifts }
        : {}),
      ...(dto.defaultFaceEnabled !== undefined
        ? { defaultFaceEnabled: dto.defaultFaceEnabled }
        : {}),
      ...(dto.defaultNfcEnabled !== undefined
        ? { defaultNfcEnabled: dto.defaultNfcEnabled }
        : {}),
      ...(dto.defaultQrEnabled !== undefined
        ? { defaultQrEnabled: dto.defaultQrEnabled }
        : {}),
      ...(dto.notificationUnclosedReminderDelayMinutes !== undefined
        ? { notificationUnclosedReminderDelayMinutes: dto.notificationUnclosedReminderDelayMinutes }
        : {}),
      ...(dto.notificationReviewReminderMinAgeMinutes !== undefined
        ? { notificationReviewReminderMinAgeMinutes: dto.notificationReviewReminderMinAgeMinutes }
        : {}),
      ...(dto.allowOfflineSync !== undefined ? { allowOfflineSync: dto.allowOfflineSync } : {}),
      ...(dto.offlineSyncMaxAgeMinutes !== undefined
        ? { offlineSyncMaxAgeMinutes: dto.offlineSyncMaxAgeMinutes }
        : {}),
      ...(dto.faceLogPhotoRetentionDays !== undefined
        ? { faceLogPhotoRetentionDays: dto.faceLogPhotoRetentionDays }
        : {}),
      ...(dto.webhookEnabled !== undefined ? { webhookEnabled: dto.webhookEnabled } : {}),
      ...(dto.webhookUrl !== undefined ? { webhookUrl: dto.webhookUrl?.trim() || null } : {}),
      ...(dto.webhookSecret !== undefined
        ? { webhookSecret: dto.webhookSecret?.trim() || null }
        : {}),
      ...(dto.defaultBreakWindowStart !== undefined
        ? { defaultBreakWindowStart: normalizeHhMm(dto.defaultBreakWindowStart) }
        : {}),
      ...(dto.defaultBreakWindowEnd !== undefined
        ? { defaultBreakWindowEnd: normalizeHhMm(dto.defaultBreakWindowEnd) }
        : {}),
      ...(dto.defaultBreakDurationMinutes !== undefined
        ? { defaultBreakDurationMinutes: dto.defaultBreakDurationMinutes }
        : {}),
    };
  }

  private toSystemConfigShape(row: {
    id: string;
    companyId: string;
    minConfidence: number;
    lateThreshold: number;
    veryLateThreshold: number;
    pinFailureThreshold: number;
    pinFailureCooldownSeconds: number;
    timesheetRoundingMinutes: number;
    overtimeAlertThresholdMinutes: number;
    minMinutesBetweenShifts: number;
    defaultFaceEnabled: boolean;
    defaultNfcEnabled: boolean;
    defaultQrEnabled: boolean;
    notificationUnclosedReminderDelayMinutes: number;
    notificationReviewReminderMinAgeMinutes: number;
    allowOfflineSync: boolean;
    offlineSyncMaxAgeMinutes: number;
    faceLogPhotoRetentionDays?: number;
    webhookEnabled?: boolean;
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    defaultShiftTypeId: string | null;
    defaultBreakWindowStart?: string | null;
    defaultBreakWindowEnd?: string | null;
    defaultBreakDurationMinutes?: number;
    company?: { id: string; name: string | null; sku: string | null } | null;
    defaultShiftType?: { id: string; shiftName: string } | null;
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      minConfidence: row.minConfidence,
      lateThreshold: row.lateThreshold,
      veryLateThreshold: row.veryLateThreshold,
      pinFailureThreshold: row.pinFailureThreshold,
      pinFailureCooldownSeconds: row.pinFailureCooldownSeconds,
      timesheetRoundingMinutes: row.timesheetRoundingMinutes,
      overtimeAlertThresholdMinutes: row.overtimeAlertThresholdMinutes,
      minMinutesBetweenShifts: row.minMinutesBetweenShifts,
      defaultFaceEnabled: row.defaultFaceEnabled,
      defaultNfcEnabled: row.defaultNfcEnabled,
      defaultQrEnabled: row.defaultQrEnabled,
      notificationUnclosedReminderDelayMinutes: row.notificationUnclosedReminderDelayMinutes,
      notificationReviewReminderMinAgeMinutes: row.notificationReviewReminderMinAgeMinutes,
      allowOfflineSync: row.allowOfflineSync,
      offlineSyncMaxAgeMinutes: row.offlineSyncMaxAgeMinutes,
      faceLogPhotoRetentionDays: row.faceLogPhotoRetentionDays ?? 30,
      webhookEnabled: row.webhookEnabled ?? false,
      webhookUrl: row.webhookUrl ?? null,
      webhookSecret: row.webhookSecret ?? null,
      defaultShiftTypeId: row.defaultShiftTypeId,
      defaultBreakWindowStart: row.defaultBreakWindowStart ?? '12:00',
      defaultBreakWindowEnd: row.defaultBreakWindowEnd ?? '13:00',
      defaultBreakDurationMinutes: row.defaultBreakDurationMinutes ?? 60,
      defaultShiftType: row.defaultShiftType
        ? { id: row.defaultShiftType.id, name: row.defaultShiftType.shiftName }
        : null,
      company: row.company
        ? {
            id: row.company.id,
            name: row.company.name ?? row.company.id,
            sku: row.company.sku ?? '',
          }
        : undefined,
    };
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }
}

/** Normalize "9:00" / "09:00" → "09:00"; empty/null → null. */
function normalizeHhMm(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return trimmed.slice(0, 5);
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
