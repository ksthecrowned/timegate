import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeGateSalaryStatus, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import {
  computeNetSalary,
  fromDecimal,
  toDecimal,
} from '../common/utils/money.util';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';

type SalaryRow = Prisma.TimeGateSalaryRecordGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
  };
}>;

@Injectable()
export class SalariesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSalaryDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.companyId) {
      throw new BadRequestException('Employee is not linked to a company');
    }

    const bonuses = dto.bonuses ?? 0;
    const deductions = dto.deductions ?? 0;
    const netSalary = computeNetSalary(dto.baseSalary, bonuses, deductions);

    try {
      const created = await this.prisma.timeGateSalaryRecord.create({
        data: {
          id: generateDocId('SAL'),
          companyId: employee.companyId,
          employeeId: dto.employeeId,
          year: dto.year,
          month: dto.month,
          baseSalary: toDecimal(dto.baseSalary),
          bonuses: toDecimal(bonuses),
          deductions: toDecimal(deductions),
          netSalary: toDecimal(netSalary),
          notes: dto.notes?.trim() || null,
        },
        include: {
          employee: { select: employeeSummarySelect },
        },
      });
      return this.toApiShape(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Salary already exists for this employee/month');
      }
      throw e;
    }
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TimeGateSalaryRecordWhereInput = {
      ...(companyId ? { companyId } : {}),
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

    const [items, total] = await Promise.all([
      this.prisma.timeGateSalaryRecord.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
        },
      }),
      this.prisma.timeGateSalaryRecord.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateSalaryRecord.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });
    if (!row) throw new NotFoundException('Salary not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateSalaryDto, user: JwtUser) {
    const existing = await this.prisma.timeGateSalaryRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary not found');
    this.assertCompanyAccess(user, existing.companyId);

    const baseSalary =
      dto.baseSalary !== undefined ? dto.baseSalary : fromDecimal(existing.baseSalary);
    const bonuses = dto.bonuses !== undefined ? dto.bonuses : fromDecimal(existing.bonuses);
    const deductions =
      dto.deductions !== undefined ? dto.deductions : fromDecimal(existing.deductions);
    const netSalary = computeNetSalary(baseSalary, bonuses, deductions);

    const updated = await this.prisma.timeGateSalaryRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.month !== undefined ? { month: dto.month } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: toDecimal(dto.baseSalary) } : {}),
        ...(dto.bonuses !== undefined ? { bonuses: toDecimal(dto.bonuses) } : {}),
        ...(dto.deductions !== undefined ? { deductions: toDecimal(dto.deductions) } : {}),
        netSalary: toDecimal(netSalary),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.paidAt ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });

    return this.toApiShape(updated);
  }

  async markPaid(id: string, user: JwtUser) {
    const existing = await this.prisma.timeGateSalaryRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary not found');
    this.assertCompanyAccess(user, existing.companyId);

    const updated = await this.prisma.timeGateSalaryRecord.update({
      where: { id },
      data: { status: TimeGateSalaryStatus.PAID, paidAt: new Date() },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });

    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.timeGateSalaryRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.timeGateSalaryRecord.delete({ where: { id } });
    return { id, deleted: true };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(row: SalaryRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      year: row.year,
      month: row.month,
      baseSalary: fromDecimal(row.baseSalary),
      bonuses: fromDecimal(row.bonuses),
      deductions: fromDecimal(row.deductions),
      netSalary: fromDecimal(row.netSalary),
      status: row.status,
      paidAt: row.paidAt?.toISOString() ?? null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
