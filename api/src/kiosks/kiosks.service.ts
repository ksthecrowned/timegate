import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KioskStatus, TimeGateUserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { KioskQueryDto } from './dto/kiosk-query.dto';
import { KioskHeartbeatDto } from './dto/kiosk-heartbeat.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';

@Injectable()
export class KiosksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateKioskDto) {
    const branchId = dto.branchId;
    if (!branchId) {
      throw new NotFoundException('branchId is required');
    }
    const branch = await this.ensureBranch(branchId);
    const existing = await this.prisma.timeGateKiosk.findUnique({
      where: { branchId },
    });
    if (existing) {
      throw new ConflictException('This branch already has a kiosk');
    }

    return this.prisma.timeGateKiosk.create({
      data: {
        id: generateDocId('KSK'),
        kioskName: dto.name.trim(),
        branchId,
        companyId: branch.companyId,
        shiftLocationId: dto.shiftLocationId,
        status: KioskStatus.OFFLINE,
        deviceApiKey: randomBytes(24).toString('hex'),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });
  }

  async findAll(query: KioskQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();
    const where = {
      ...(this.resolveCompanyFilter(user) ? { companyId: this.resolveCompanyFilter(user) } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
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
      this.prisma.timeGateKiosk.findMany({
        where,
        orderBy: { kioskName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branch: { select: { id: true, branchName: true } },
          shiftLocation: { select: { id: true, locationName: true } },
        },
      }),
      this.prisma.timeGateKiosk.count({ where }),
    ]);
    return {
      data: items.map((k) => this.toApiShape(k)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id },
      include: { branch: true, shiftLocation: { select: { id: true, locationName: true } } },
    });
    if (!kiosk) {
      throw new NotFoundException('Kiosk not found');
    }
    if (user) {
      this.assertCompanyAccess(user, kiosk.companyId);
    }
    return this.toApiShape(kiosk);
  }

  async update(id: string, dto: UpdateKioskDto, user: JwtUser) {
    await this.findOne(id, user);
    if (dto.branchId) {
      await this.ensureBranch(dto.branchId);
    }
    const updated = await this.prisma.timeGateKiosk.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { kioskName: dto.name.trim() } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.shiftLocationId !== undefined ? { shiftLocationId: dto.shiftLocationId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    return this.toApiShape(updated);
  }

  async heartbeat(id: string, dto: KioskHeartbeatDto, user: JwtUser) {
    await this.findOne(id, user);
    const updated = await this.prisma.timeGateKiosk.update({
      where: { id },
      data: {
        lastSeenAt: new Date(),
        ...(dto.status ? { status: dto.status } : { status: KioskStatus.ONLINE }),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.timeGateKiosk.delete({ where: { id } });
    return { id, deleted: true };
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private async ensureBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  private toApiShape(kiosk: {
    id: string;
    kioskName: string;
    branchId: string;
    companyId: string;
    shiftLocationId?: string | null;
    status: KioskStatus;
    isActive: boolean;
    lastSeenAt: Date | null;
    deviceApiKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    branch?: { id: string; branchName: string } | null;
    shiftLocation?: { id: string; locationName: string } | null;
  }) {
    return {
      id: kiosk.id,
      name: kiosk.kioskName,
      branchId: kiosk.branchId,
      companyId: kiosk.companyId,
      shiftLocationId: kiosk.shiftLocationId ?? null,
      status: kiosk.status,
      isActive: kiosk.isActive,
      lastSeenAt: kiosk.lastSeenAt,
      location: kiosk.shiftLocation?.locationName ?? null,
      apiKey: kiosk.deviceApiKey,
      createdAt: kiosk.createdAt,
      updatedAt: kiosk.updatedAt,
      branch: kiosk.branch
        ? { id: kiosk.branch.id, name: kiosk.branch.branchName }
        : undefined,
      shiftLocation: kiosk.shiftLocation
        ? { id: kiosk.shiftLocation.id, name: kiosk.shiftLocation.locationName }
        : undefined,
    };
  }
}
