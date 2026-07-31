import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, WeekDay } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { formatTimeAsIso, toTimeOnlyDate } from '../common/utils/time.util';
import { CreateWorkScheduleDto, ShiftWeekDayInputDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { formatPunchWindows, mapPunchWindowFields } from './punch-window.mapper';

@Injectable()
export class WorkSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkScheduleDto, user: JwtUser) {
    const branchId = dto.branchId;
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    this.assertCompanyAccess(user, branch.companyId);

    const weekDays = this.normalizeWeekDays(dto.weekDays);

    const created = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.shiftType.create({
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
      });
      if (weekDays.length > 0) {
        await tx.shiftTypeWeekDay.createMany({
          data: weekDays.map((wd) => ({
            id: generateDocId('SWD'),
            shiftTypeId: shift.id,
            day: wd.day,
            startTime: wd.startTime,
            endTime: wd.endTime,
          })),
        });
      }
      return tx.shiftType.findUniqueOrThrow({
        where: { id: shift.id },
        include: {
          branch: { select: { id: true, branchName: true } },
          weekDays: { orderBy: { day: 'asc' } },
        },
      });
    });

    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();

    const where: Prisma.ShiftTypeWhereInput = {
      ...(user.role === PLATFORM_ADMIN ? {} : { companyId: user.companyId }),
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
        include: {
          branch: { select: { id: true, branchName: true } },
          weekDays: { orderBy: { day: 'asc' } },
        },
      }),
      this.prisma.shiftType.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.shiftType.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, branchName: true } },
        weekDays: { orderBy: { day: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Work schedule not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateWorkScheduleDto, user: JwtUser) {
    const current = await this.prisma.shiftType.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Work schedule not found');
    this.assertCompanyAccess(user, current.companyId);

    let companyId = current.companyId;
    let branchId = current.branchId;
    const nextBranchId = dto.branchId;
    if (nextBranchId && nextBranchId !== current.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: nextBranchId } });
      if (!branch) throw new NotFoundException('Branch not found');
      this.assertCompanyAccess(user, branch.companyId);
      companyId = branch.companyId;
      branchId = branch.id;
    }

    const weekDays =
      dto.weekDays !== undefined ? this.normalizeWeekDays(dto.weekDays) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.shiftType.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { shiftName: dto.name.trim() } : {}),
          ...(companyId !== undefined ? { companyId } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
          ...(dto.startTime !== undefined ? { startTime: toTimeOnlyDate(dto.startTime) } : {}),
          ...(dto.endTime !== undefined ? { endTime: toTimeOnlyDate(dto.endTime) } : {}),
          ...(dto.lateGraceMinutes !== undefined ? { lateGraceMinutes: dto.lateGraceMinutes } : {}),
          ...mapPunchWindowFields(dto, current),
        },
      });

      if (weekDays !== undefined) {
        await tx.shiftTypeWeekDay.deleteMany({ where: { shiftTypeId: id } });
        if (weekDays.length > 0) {
          await tx.shiftTypeWeekDay.createMany({
            data: weekDays.map((wd) => ({
              id: generateDocId('SWD'),
              shiftTypeId: id,
              day: wd.day,
              startTime: wd.startTime,
              endTime: wd.endTime,
            })),
          });
        }
      }

      return tx.shiftType.findUniqueOrThrow({
        where: { id },
        include: {
          branch: { select: { id: true, branchName: true } },
          weekDays: { orderBy: { day: 'asc' } },
        },
      });
    });

    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
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

  private normalizeWeekDays(weekDays?: ShiftWeekDayInputDto[]): Array<{
    day: WeekDay;
    startTime: string;
    endTime: string;
  }> {
    if (!weekDays) return [];
    const seen = new Set<WeekDay>();
    const normalized: Array<{ day: WeekDay; startTime: string; endTime: string }> = [];
    for (const row of weekDays) {
      if (seen.has(row.day)) {
        throw new BadRequestException(`Duplicate weekday: ${row.day}`);
      }
      seen.add(row.day);
      normalized.push({
        day: row.day,
        startTime: this.normalizeHhMm(row.startTime),
        endTime: this.normalizeHhMm(row.endTime),
      });
    }
    return normalized;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new NotFoundException('Work schedule not found');
    }
  }

  private normalizeHhMm(value: string): string {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return value.slice(0, 5);
    const h = Math.min(23, Math.max(0, Number(match[1])));
    const m = Math.min(59, Math.max(0, Number(match[2])));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
      weekDays: (row.weekDays ?? []).map((wd) => ({
        id: wd.id,
        day: wd.day,
        startTime: wd.startTime,
        endTime: wd.endTime,
        shiftTypeId: row.id,
      })),
    };
  }
}
