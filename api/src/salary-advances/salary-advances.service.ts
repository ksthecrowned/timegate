import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SalaryAdvanceStatus } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { fromDecimal, toDecimal } from '../common/utils/money.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryAdvanceDto } from './dto/create-salary-advance.dto';

@Injectable()
export class SalaryAdvancesService {
  constructor(private prisma: PrismaService) {}

  async create(employeeId: string, dto: CreateSalaryAdvanceDto, user: JwtUser) {
    const employee = await this.requireEmployee(employeeId, user);
    const disbursed = dto.disbursed === true;
    const now = new Date();

    const row = await this.prisma.salaryAdvance.create({
      data: {
        id: generateDocId('SADV'),
        companyId: employee.companyId,
        employeeId,
        amount: toDecimal(dto.amount),
        notes: dto.notes?.trim() || null,
        status: disbursed ? SalaryAdvanceStatus.DISBURSED : SalaryAdvanceStatus.PENDING,
        paidAt: disbursed ? now : null,
      },
    });
    return this.toShape(row);
  }

  async findAllForEmployee(employeeId: string, user: JwtUser) {
    await this.requireEmployee(employeeId, user);
    const rows = await this.prisma.salaryAdvance.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toShape(r));
  }

  async disburse(id: string, user: JwtUser) {
    const row = await this.prisma.salaryAdvance.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Salary advance not found');
    this.assertCompanyAccess(user, row.companyId);

    if (row.status !== SalaryAdvanceStatus.PENDING) {
      throw new BadRequestException('Only PENDING advances can be marked as disbursed');
    }

    const updated = await this.prisma.salaryAdvance.update({
      where: { id },
      data: {
        status: SalaryAdvanceStatus.DISBURSED,
        paidAt: new Date(),
      },
    });
    return this.toShape(updated);
  }

  async cancel(id: string, user: JwtUser) {
    const row = await this.prisma.salaryAdvance.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Salary advance not found');
    this.assertCompanyAccess(user, row.companyId);

    if (row.status === SalaryAdvanceStatus.DEDUCTED) {
      throw new BadRequestException('Cannot cancel an advance already deducted from payroll');
    }
    if (row.status === SalaryAdvanceStatus.CANCELLED) {
      return this.toShape(row);
    }

    const updated = await this.prisma.salaryAdvance.update({
      where: { id },
      data: { status: SalaryAdvanceStatus.CANCELLED },
    });
    return this.toShape(updated);
  }

  private async requireEmployee(employeeId: string, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);
    return employee;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private toShape(row: {
    id: string;
    companyId: string;
    employeeId: string;
    amount: Prisma.Decimal;
    status: SalaryAdvanceStatus;
    notes: string | null;
    paidAt: Date | null;
    deductedAt: Date | null;
    payrollRunId: string | null;
    payrollVariableItemId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      amount: fromDecimal(row.amount),
      status: row.status,
      notes: row.notes,
      paidAt: row.paidAt?.toISOString() ?? null,
      deductedAt: row.deductedAt?.toISOString() ?? null,
      payrollRunId: row.payrollRunId,
      payrollVariableItemId: row.payrollVariableItemId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
