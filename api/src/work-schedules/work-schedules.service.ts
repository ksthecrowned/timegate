import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@Injectable()
export class WorkSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkScheduleDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');
    return this.prisma.workSchedule.create({
      data: {
        siteId: dto.siteId,
        organizationId: site.organizationId,
        name: dto.name,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        lateGraceMinutes: dto.lateGraceMinutes ?? 5,
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.workSchedule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { site: { select: { id: true, name: true } } },
      }),
      this.prisma.workSchedule.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateWorkScheduleDto) {
    const current = await this.prisma.workSchedule.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('WorkSchedule not found');
    let organizationId = current.organizationId;
    if (dto.siteId && dto.siteId !== current.siteId) {
      const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
      if (!site) throw new NotFoundException('Site not found');
      organizationId = site.organizationId;
    }
    return this.prisma.workSchedule.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startTime ? { startTime: new Date(dto.startTime) } : {}),
        ...(dto.endTime ? { endTime: new Date(dto.endTime) } : {}),
        organizationId,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.workSchedule.delete({ where: { id } });
    return { id, deleted: true };
  }
}
