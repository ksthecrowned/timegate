import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { CompensationItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreateEmployeeCompensationItemDto } from './dto/create-employee-compensation-item.dto';
import { UpdateEmployeeCompensationItemDto } from './dto/update-employee-compensation-item.dto';

@Injectable()
export class EmployeeCompensationService {
  constructor(private prisma: PrismaService) {}

  async create(employeeId: string, dto: CreateEmployeeCompensationItemDto, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const item = await this.prisma.employeeCompensationItem.create({
      data: {
        id: generateDocId('ECITEM'),
        companyId: employee.companyId,
        employeeId,
        label: dto.label,
        kind: dto.kind,
        amount: toDecimal(dto.amount),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    return this.toShape(item);
  }

  async findAllForEmployee(employeeId: string, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const items = await this.prisma.employeeCompensationItem.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return items.map((i) => this.toShape(i));
  }

  async findActiveForEmployee(companyId: string, employeeId: string, date: Date) {
    return this.prisma.employeeCompensationItem.findMany({
      where: {
        companyId,
        employeeId,
        isActive: true,
        isRecurring: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeCompensationItemDto, user: JwtUser) {
    const item = await this.prisma.employeeCompensationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Compensation item not found');
    this.assertCompanyAccess(user, item.companyId);

    const updated = await this.prisma.employeeCompensationItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.amount !== undefined ? { amount: toDecimal(dto.amount) } : {}),
        ...(dto.isRecurring !== undefined ? { isRecurring: dto.isRecurring } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const item = await this.prisma.employeeCompensationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Compensation item not found');
    this.assertCompanyAccess(user, item.companyId);
    await this.prisma.employeeCompensationItem.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      label: row.label,
      kind: row.kind,
      amount: fromDecimal(row.amount),
      isRecurring: row.isRecurring,
      effectiveFrom: row.effectiveFrom?.toISOString?.() ?? row.effectiveFrom,
      effectiveTo: row.effectiveTo?.toISOString?.() ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
