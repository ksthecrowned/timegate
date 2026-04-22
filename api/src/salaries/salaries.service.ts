import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SalaryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';

@Injectable()
export class SalariesService {
  constructor(private prisma: PrismaService) {}

  private computeNet(baseSalary: number, bonuses?: number, deductions?: number) {
    return Number((baseSalary + (bonuses ?? 0) - (deductions ?? 0)).toFixed(2));
  }

  async create(dto: CreateSalaryDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const netSalary = this.computeNet(dto.baseSalary, dto.bonuses, dto.deductions);
    try {
      return await this.prisma.salaryRecord.create({
        data: {
          employeeId: dto.employeeId,
          organizationId: employee.organizationId,
          year: dto.year,
          month: dto.month,
          baseSalary: dto.baseSalary,
          bonuses: dto.bonuses ?? 0,
          deductions: dto.deductions ?? 0,
          netSalary,
          notes: dto.notes?.trim() || undefined,
        },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      });
    } catch (e) {
      if (String(e).includes('Unique constraint')) {
        throw new ConflictException('Salary already exists for this employee/month');
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
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.salaryRecord.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.salaryRecord.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(id: string, dto: UpdateSalaryDto) {
    const existing = await this.prisma.salaryRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary not found');

    const baseSalary = dto.baseSalary ?? existing.baseSalary;
    const bonuses = dto.bonuses ?? existing.bonuses;
    const deductions = dto.deductions ?? existing.deductions;
    const netSalary = this.computeNet(baseSalary, bonuses, deductions);

    return this.prisma.salaryRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.year ? { year: dto.year } : {}),
        ...(dto.month ? { month: dto.month } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: dto.baseSalary } : {}),
        ...(dto.bonuses !== undefined ? { bonuses: dto.bonuses } : {}),
        ...(dto.deductions !== undefined ? { deductions: dto.deductions } : {}),
        netSalary,
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.paidAt ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async markPaid(id: string) {
    await this.prisma.salaryRecord.findUniqueOrThrow({ where: { id } });
    return this.prisma.salaryRecord.update({
      where: { id },
      data: { status: SalaryStatus.PAID, paidAt: new Date() },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
  }

  async remove(id: string) {
    await this.prisma.salaryRecord.delete({ where: { id } });
    return { id, deleted: true };
  }
}
