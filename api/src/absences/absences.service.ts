import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Injectable()
export class AbsencesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAbsenceDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const date = new Date(dto.date);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    try {
      return await this.prisma.absenceRecord.create({
        data: {
          employeeId: dto.employeeId,
          organizationId: employee.organizationId,
          date: day,
          justified: dto.justified ?? false,
          reason: dto.reason?.trim() || undefined,
          justificationFileUrl: dto.justificationFileUrl?.trim() || undefined,
        },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      });
    } catch (e) {
      if (String(e).includes('Unique constraint')) {
        throw new ConflictException('Absence already exists for this employee/date');
      }
      throw e;
    }
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
      this.prisma.absenceRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.absenceRecord.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateAbsenceDto) {
    const existing = await this.prisma.absenceRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Absence not found');
    return this.prisma.absenceRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
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
    await this.prisma.absenceRecord.delete({ where: { id } });
    return { id, deleted: true };
  }
}
