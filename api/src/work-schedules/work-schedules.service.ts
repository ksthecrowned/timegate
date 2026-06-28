import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { formatTimeAsIso, toTimeOnlyDate } from '../common/utils/time.util';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { formatPunchWindows, mapPunchWindowFields } from './punch-window.mapper';

@Injectable()
export class WorkSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkScheduleDto) {
    const branchId = dto.branchId;
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const created = await this.prisma.shiftType.create({
      data: {
        id: generateDocId('SHIFT'),
        shiftName: dto.name.trim(),
        companyId: branch.companyId,
        branchId: branch.id,
        startTime: toTimeOnlyDate(dto.startTime),
        endTime: toTimeOnlyDate(dto.endTime),
        lateGraceMinutes: dto.lateGraceMinutes ?? 5,
        ...mapPunchWindowFields(dto),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });

    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();

    const where: Prisma.ShiftTypeWhereInput = {
      ...(branchId ? { branchId } : {}),
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
      this.prisma.shiftType.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { branch: { select: { id: true, branchName: true } } },
      }),
      this.prisma.shiftType.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.shiftType.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, branchName: true } },
        weekDays: { orderBy: { day: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Work schedule not found');
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateWorkScheduleDto) {
    const current = await this.prisma.shiftType.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Work schedule not found');

    let companyId = current.companyId;
    let branchId = current.branchId;
    const nextBranchId = dto.branchId;
    if (nextBranchId && nextBranchId !== current.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: nextBranchId } });
      if (!branch) throw new NotFoundException('Branch not found');
      companyId = branch.companyId;
      branchId = branch.id;
    }

    const updated = await this.prisma.shiftType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { shiftName: dto.name.trim() } : {}),
        ...(companyId !== undefined ? { companyId } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(dto.startTime !== undefined ? { startTime: toTimeOnlyDate(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: toTimeOnlyDate(dto.endTime) } : {}),
        ...(dto.lateGraceMinutes !== undefined ? { lateGraceMinutes: dto.lateGraceMinutes } : {}),
        ...mapPunchWindowFields(dto),
      },
      include: { branch: { select: { id: true, branchName: true } } },
    });

    return this.toApiShape(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.employee.updateMany({
          where: { defaultShiftId: id },
          data: { defaultShiftId: null },
        });
        await tx.employeeCheckin.updateMany({
          where: { shiftId: id },
          data: { shiftId: null },
        });
        await tx.attendance.updateMany({
          where: { shiftId: id },
          data: { shiftId: null },
        });
        await tx.shiftAssignment.deleteMany({ where: { shiftTypeId: id } });
        await tx.shiftType.delete({ where: { id } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Impossible de supprimer cet horaire : des enregistrements y sont encore liés.',
        );
      }
      throw error;
    }
    return { id, deleted: true };
  }

  private toApiShape(row: {
    id: string;
    shiftName: string;
    companyId: string | null;
    branchId: string | null;
    startTime: Date | null;
    endTime: Date | null;
    lateGraceMinutes: number;
    checkInWindowStart?: Date | null;
    checkInWindowEnd?: Date | null;
    checkOutWindowStart?: Date | null;
    checkOutWindowEnd?: Date | null;
    breakWindowStart?: Date | null;
    breakWindowEnd?: Date | null;
    breakDurationMinutes?: number | null;
    createdAt: Date;
    branch?: { id: string; branchName: string } | null;
    weekDays?: Array<{ id: string; day: string; startTime: string; endTime: string }>;
  }) {
    return {
      id: row.id,
      name: row.shiftName,
      branchId: row.branchId,
      companyId: row.companyId,
      startTime: formatTimeAsIso(row.startTime),
      endTime: formatTimeAsIso(row.endTime),
      lateGraceMinutes: row.lateGraceMinutes,
      ...formatPunchWindows(row),
      createdAt: row.createdAt.toISOString(),
      branch: row.branch ? { id: row.branch.id, name: row.branch.branchName } : undefined,
      weekDays: row.weekDays,
    };
  }
}
