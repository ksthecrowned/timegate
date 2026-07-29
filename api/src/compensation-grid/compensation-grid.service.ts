import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreateCompensationGridDto } from './dto/create-compensation-grid.dto';
import { UpdateCompensationGridDto } from './dto/update-compensation-grid.dto';
import { FindCompensationGridQueryDto } from './dto/find-compensation-grid-query.dto';

@Injectable()
export class CompensationGridService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompensationGridDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);

    const overlap = await this.prisma.compensationGrid.findFirst({
      where: {
        companyId,
        designationId: dto.designationId,
        employmentTypeId: dto.employmentTypeId,
        effectiveFrom: { lte: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(dto.effectiveFrom) } },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'An overlapping compensation grid entry already exists for this designation/employment type combination',
      );
    }

    const entry = await this.prisma.compensationGrid.create({
      data: {
        id: generateDocId('CGRID'),
        companyId,
        designationId: dto.designationId,
        employmentTypeId: dto.employmentTypeId,
        baseSalary: toDecimal(dto.baseSalary),
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    return this.toShape(entry);
  }

  async findAll(query: FindCompensationGridQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.CompensationGridWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.employmentTypeId ? { employmentTypeId: query.employmentTypeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.compensationGrid.findMany({
        where,
        orderBy: [{ effectiveFrom: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.compensationGrid.count({ where }),
    ]);

    return {
      data: items.map((r) => this.toShape(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const entry = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, entry.companyId);
    return this.toShape(entry);
  }

  async findEffective(
    companyId: string,
    designationId: string,
    employmentTypeId: string,
    date: Date,
  ) {
    return this.prisma.compensationGrid.findFirst({
      where: {
        companyId,
        designationId,
        employmentTypeId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async update(id: string, dto: UpdateCompensationGridDto, user: JwtUser) {
    const existing = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, existing.companyId);

    const updated = await this.prisma.compensationGrid.update({
      where: { id },
      data: {
        ...(dto.designationId !== undefined ? { designationId: dto.designationId } : {}),
        ...(dto.employmentTypeId !== undefined ? { employmentTypeId: dto.employmentTypeId } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: toDecimal(dto.baseSalary) } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.compensationGrid.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      designationId: row.designationId,
      employmentTypeId: row.employmentTypeId,
      baseSalary: fromDecimal(row.baseSalary),
      effectiveFrom: row.effectiveFrom?.toISOString?.() ?? row.effectiveFrom,
      effectiveTo: row.effectiveTo?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private requireCompanyId(user: JwtUser): string {
    if (user.role === PLATFORM_ADMIN) {
      throw new BadRequestException('Super admin must specify company via a dedicated flow');
    }
    if (!user.companyId) throw new BadRequestException('User not linked to a company');
    return user.companyId;
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
