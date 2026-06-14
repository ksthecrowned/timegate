import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateShiftLocationDto } from './dto/create-shift-location.dto';
import { ShiftLocationQueryDto } from './dto/shift-location-query.dto';
import { UpdateShiftLocationDto } from './dto/update-shift-location.dto';

@Injectable()
export class ShiftLocationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftLocationDto) {
    const branchId = dto.branchId;
    if (branchId) {
      await this.ensureBranch(branchId);
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
        branchId: branchId ?? null,
        checkinRadius: dto.checkinRadius,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isKioskLocation: dto.isKioskLocation ?? false,
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    return this.toApiShape(created);
  }

  async findAll(query: ShiftLocationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();

    const where: Prisma.ShiftLocationWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(query.isKioskLocation !== undefined ? { isKioskLocation: query.isKioskLocation } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shiftLocation.findMany({
        where,
        orderBy: { locationName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { branch: { select: { id: true, branchName: true } } },
      }),
      this.prisma.shiftLocation.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.shiftLocation.findUnique({
      where: { id },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    if (!row) throw new NotFoundException('Shift location not found');
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateShiftLocationDto) {
    const current = await this.prisma.shiftLocation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Shift location not found');

    const branchId = dto.branchId;
    if (branchId) await this.ensureBranch(branchId);

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
        ...(branchId !== undefined ? { branchId } : {}),
        ...(dto.checkinRadius !== undefined ? { checkinRadius: dto.checkinRadius } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.isKioskLocation !== undefined ? { isKioskLocation: dto.isKioskLocation } : {}),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.shiftLocation.delete({ where: { id } });
    return { id, deleted: true };
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
