import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { TimeGatePayrollRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreatePayrollVariableItemDto } from './dto/create-payroll-variable-item.dto';

@Injectable()
export class PayrollVariableItemsService {
  constructor(private prisma: PrismaService) {}

  async create(runId: string, dto: CreatePayrollVariableItemDto, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);
    if (run.status !== TimeGatePayrollRunStatus.DRAFT) {
      throw new BadRequestException('Can only add variable items to DRAFT runs');
    }

    const item = await this.prisma.payrollVariableItem.create({
      data: {
        id: generateDocId('PVITEM'),
        companyId: run.companyId,
        employeeId: dto.employeeId,
        payrollRunId: runId,
        label: dto.label,
        kind: dto.kind,
        amount: toDecimal(dto.amount),
        source: 'MANUAL',
        notes: dto.notes ?? null,
      },
    });

    return this.toShape(item);
  }

  async findForRun(runId: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);

    const items = await this.prisma.payrollVariableItem.findMany({
      where: { payrollRunId: runId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((i) => this.toShape(i));
  }

  async remove(id: string, user: JwtUser) {
    const item = await this.prisma.payrollVariableItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Variable item not found');
    this.assertCompanyAccess(user, item.companyId);

    if (item.payrollRunId) {
      const run = await this.prisma.timeGatePayrollRun.findUnique({
        where: { id: item.payrollRunId },
      });
      if (run && run.status !== TimeGatePayrollRunStatus.DRAFT) {
        throw new BadRequestException('Cannot remove items from a non-DRAFT run');
      }
    }

    await this.prisma.payrollVariableItem.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      payrollRunId: row.payrollRunId,
      label: row.label,
      kind: row.kind,
      amount: fromDecimal(row.amount),
      source: row.source,
      notes: row.notes,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
