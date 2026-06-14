import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CreateWorkDayDto } from './dto/create-work-day.dto';
import { UpdateWorkDayDto } from './dto/update-work-day.dto';
import { WorkDayQueryDto } from './dto/work-day-query.dto';

@Injectable()
export class WorkDaysService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkDayDto) {
    const schedule = await this.prisma.shiftType.findUnique({ where: { id: dto.scheduleId } });
    if (!schedule) throw new NotFoundException('Work schedule not found');

    try {
      const created = await this.prisma.shiftTypeWeekDay.create({
        data: {
          id: generateDocId('SWD'),
          shiftTypeId: dto.scheduleId,
          day: dto.day,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
        include: {
          shiftType: { select: { id: true, shiftName: true, branchId: true } },
        },
      });
      return this.toApiShape(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Work day already exists for this schedule and weekday');
      }
      throw error;
    }
  }

  async findAll(query: WorkDayQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();

    const companyId = this.resolveCompanyFilter(user);
    const shiftTypeWhere: Prisma.ShiftTypeWhereInput | undefined =
      branchId || companyId
        ? {
            ...(branchId ? { branchId } : {}),
            ...(companyId ? { companyId } : {}),
          }
        : undefined;
    const where: Prisma.ShiftTypeWeekDayWhereInput = {
      ...(query.scheduleId ? { shiftTypeId: query.scheduleId } : {}),
      ...(shiftTypeWhere ? { shiftType: shiftTypeWhere } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shiftTypeWeekDay.findMany({
        where,
        orderBy: [{ shiftTypeId: 'asc' }, { day: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          shiftType: { select: { id: true, shiftName: true, branchId: true } },
        },
      }),
      this.prisma.shiftTypeWeekDay.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.shiftTypeWeekDay.findUnique({
      where: { id },
      include: {
        shiftType: { select: { id: true, shiftName: true, branchId: true, companyId: true } },
      },
    });
    if (!row) throw new NotFoundException('Work day not found');
    if (!row.shiftType?.companyId) throw new NotFoundException('Work day company not found');
    this.assertCompanyAccess(user, row.shiftType.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateWorkDayDto, user: JwtUser) {
    const existing = await this.prisma.shiftTypeWeekDay.findUnique({
      where: { id },
      include: { shiftType: true },
    });
    if (!existing) throw new NotFoundException('Work day not found');
    this.assertCompanyAccess(user, existing.shiftType.companyId ?? '');

    if (dto.scheduleId && dto.scheduleId !== existing.shiftTypeId) {
      const schedule = await this.prisma.shiftType.findUnique({ where: { id: dto.scheduleId } });
      if (!schedule) throw new NotFoundException('Work schedule not found');
    }

    try {
      const updated = await this.prisma.shiftTypeWeekDay.update({
        where: { id },
        data: {
          ...(dto.scheduleId !== undefined ? { shiftTypeId: dto.scheduleId } : {}),
          ...(dto.day !== undefined ? { day: dto.day } : {}),
          ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
          ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        },
        include: {
          shiftType: { select: { id: true, shiftName: true, branchId: true } },
        },
      });
      return this.toApiShape(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Work day already exists for this schedule and weekday');
      }
      throw error;
    }
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.shiftTypeWeekDay.findUnique({
      where: { id },
      include: { shiftType: true },
    });
    if (!existing) throw new NotFoundException('Work day not found');
    this.assertCompanyAccess(user, existing.shiftType.companyId ?? '');
    await this.prisma.shiftTypeWeekDay.delete({ where: { id } });
    return { id, deleted: true };
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(row: {
    id: string;
    shiftTypeId: string;
    day: string;
    startTime: string;
    endTime: string;
    shiftType?: { id: string; shiftName: string; branchId: string | null };
  }) {
    return {
      id: row.id,
      shiftTypeId: row.shiftTypeId,
      day: row.day,
      startTime: row.startTime,
      endTime: row.endTime,
      shiftType: row.shiftType
        ? {
            id: row.shiftType.id,
            name: row.shiftType.shiftName,
            branchId: row.shiftType.branchId,
          }
        : undefined,
    };
  }
}
