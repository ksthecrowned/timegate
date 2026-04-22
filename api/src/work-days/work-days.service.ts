import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateWorkDayDto } from './dto/create-work-day.dto';
import { UpdateWorkDayDto } from './dto/update-work-day.dto';

@Injectable()
export class WorkDaysService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkDayDto) {
    const schedule = await this.prisma.workSchedule.findUnique({ where: { id: dto.scheduleId } });
    if (!schedule) throw new NotFoundException('WorkSchedule not found');
    return this.prisma.workDay.create({ data: dto });
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.siteId ? { schedule: { siteId: query.siteId } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.workDay.findMany({
        where,
        include: { schedule: { select: { id: true, name: true, siteId: true } } },
        orderBy: [{ scheduleId: 'asc' }, { day: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workDay.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateWorkDayDto) {
    const existing = await this.prisma.workDay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('WorkDay not found');
    return this.prisma.workDay.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.workDay.delete({ where: { id } });
    return { id, deleted: true };
  }
}
