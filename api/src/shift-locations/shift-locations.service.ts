import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateShiftLocationDto } from './dto/create-shift-location.dto';
import { ShiftLocationQueryDto } from './dto/shift-location-query.dto';
import { UpdateShiftLocationDto } from './dto/update-shift-location.dto';

type ShiftLocationRow = Prisma.ShiftLocationGetPayload<{
  include: { branch: { select: { id: true; branchName: true; companyId: true } } };
}>;

@Injectable()
export class ShiftLocationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftLocationDto, user: JwtUser) {
    const branchId = dto.branchId;
    if (!branchId && user.role !== PLATFORM_ADMIN) {
      throw new BadRequestException('branchId is required');
    }

    let resolvedBranchId: string | null = null;
    if (branchId) {
      const branch = await this.ensureBranch(branchId);
      this.assertCompanyAccess(user, branch.companyId);
      resolvedBranchId = branch.id;
    }

    const name = dto.name.trim();
    const existing = await this.prisma.shiftLocation.findUnique({ where: { locationName: name } });
    if (existing) {
      throw new ConflictException('Shift location name already exists');
    }

    const created = await this.prisma.shiftLocation.create({
      data: {
        id: generateDocId('SLOC'),
        locationName: name,
        branchId: resolvedBranchId,
        checkinRadius: dto.checkinRadius,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isKioskLocation: dto.isKioskLocation ?? false,
      },
      include: { branch: { select: { id: true, branchName: true, companyId: true } } },
    });
    return this.toApiShape(created);
  }

  async findAll(query: ShiftLocationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();

    if (branchId) {
      const branch = await this.ensureBranch(branchId);
      this.assertCompanyAccess(user, branch.companyId);
    }

    const where: Prisma.ShiftLocationWhereInput = {
      ...(user.role === PLATFORM_ADMIN
        ? {}
        : { branch: { companyId: user.companyId ?? '__none__' } }),
      ...(branchId ? { branchId } : {}),
      ...(query.isKioskLocation !== undefined ? { isKioskLocation: query.isKioskLocation } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shiftLocation.findMany({
        where,
        orderBy: { locationName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { branch: { select: { id: true, branchName: true, companyId: true } } },
      }),
      this.prisma.shiftLocation.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.loadOrThrow(id);
    this.assertRowAccess(user, row);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateShiftLocationDto, user: JwtUser) {
    const current = await this.loadOrThrow(id);
    this.assertRowAccess(user, current);

    const branchId = dto.branchId;
    if (branchId !== undefined) {
      if (!branchId) {
        if (user.role !== PLATFORM_ADMIN) {
          throw new BadRequestException('branchId is required');
        }
      } else {
        const branch = await this.ensureBranch(branchId);
        this.assertCompanyAccess(user, branch.companyId);
      }
    }

    if (dto.name && dto.name.trim() !== current.locationName) {
      const clash = await this.prisma.shiftLocation.findUnique({
        where: { locationName: dto.name.trim() },
      });
      if (clash) throw new ConflictException('Shift location name already exists');
    }

    const updated = await this.prisma.shiftLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { locationName: dto.name.trim() } : {}),
        ...(branchId !== undefined ? { branchId: branchId || null } : {}),
        ...(dto.checkinRadius !== undefined ? { checkinRadius: dto.checkinRadius } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.isKioskLocation !== undefined ? { isKioskLocation: dto.isKioskLocation } : {}),
      },
      include: { branch: { select: { id: true, branchName: true, companyId: true } } },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const current = await this.loadOrThrow(id);
    this.assertRowAccess(user, current);
    await this.prisma.shiftLocation.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async loadOrThrow(id: string): Promise<ShiftLocationRow> {
    const row = await this.prisma.shiftLocation.findUnique({
      where: { id },
      include: { branch: { select: { id: true, branchName: true, companyId: true } } },
    });
    if (!row) throw new NotFoundException('Shift location not found');
    return row;
  }

  private assertRowAccess(user: JwtUser, row: ShiftLocationRow) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!row.branch?.companyId) {
      throw new NotFoundException('Shift location not found');
    }
    this.assertCompanyAccess(user, row.branch.companyId);
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new NotFoundException('Shift location not found');
    }
  }

  private async ensureBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  private toApiShape(row: {
    id: string;
    locationName: string;
    branchId: string | null;
    checkinRadius: number | null;
    latitude: number | null;
    longitude: number | null;
    isKioskLocation: boolean;
    createdAt: Date;
    updatedAt: Date;
    branch?: { id: string; branchName: string } | null;
  }) {
    return {
      id: row.id,
      name: row.locationName,
      branchId: row.branchId,
      checkinRadius: row.checkinRadius,
      latitude: row.latitude,
      longitude: row.longitude,
      isKioskLocation: row.isKioskLocation,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      branch: row.branch ? { id: row.branch.id, name: row.branch.branchName } : undefined,
    };
  }
}
