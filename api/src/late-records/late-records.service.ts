import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateLateRecordDto } from './dto/create-late-record.dto';
import { UpdateLateRecordDto } from './dto/update-late-record.dto';

@Injectable()
export class LateRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLateRecordDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.lateRecord.create({
      data: {
        employeeId: dto.employeeId,
        organizationId: employee.organizationId,
        date: new Date(dto.date),
        latenessMinutes: dto.latenessMinutes,
        justified: dto.justified ?? false,
        reason: dto.reason?.trim() || undefined,
        justificationFileUrl: dto.justificationFileUrl?.trim() || undefined,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.lateRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.lateRecord.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateLateRecordDto) {
    const existing = await this.prisma.lateRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Late record not found');
    return this.prisma.lateRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.latenessMinutes ? { latenessMinutes: dto.latenessMinutes } : {}),
        ...(typeof dto.justified === 'boolean' ? { justified: dto.justified } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason?.trim() || null } : {}),
        ...(dto.justificationFileUrl !== undefined
          ? { justificationFileUrl: dto.justificationFileUrl?.trim() || null }
          : {}),
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.lateRecord.delete({ where: { id } });
    return { id, deleted: true };
  }
}
