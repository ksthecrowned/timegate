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

type CompensationGridRow = Prisma.CompensationGridGetPayload<object>;

@Injectable()
export class CompensationGridService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompensationGridDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    await this.ensureDesignation(dto.designationId, companyId);
    await this.ensureEmploymentType(dto.employmentTypeId, companyId);

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    this.assertDateRange(effectiveFrom, effectiveTo);
    await this.assertNoOverlap({
      companyId,
      designationId: dto.designationId,
      employmentTypeId: dto.employmentTypeId,
      effectiveFrom,
      effectiveTo,
    });

    const entry = await this.prisma.compensationGrid.create({
      data: {
        id: generateDocId('CGRID'),
        companyId,
        designationId: dto.designationId,
        employmentTypeId: dto.employmentTypeId,
        baseSalary: toDecimal(dto.baseSalary),
        effectiveFrom,
        effectiveTo,
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

    const designationId = dto.designationId ?? existing.designationId;
    const employmentTypeId = dto.employmentTypeId ?? existing.employmentTypeId;
    if (dto.designationId !== undefined) {
      await this.ensureDesignation(designationId, existing.companyId);
    }
    if (dto.employmentTypeId !== undefined) {
      await this.ensureEmploymentType(employmentTypeId, existing.companyId);
    }

    const effectiveFrom =
      dto.effectiveFrom !== undefined ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo !== undefined
        ? dto.effectiveTo
          ? new Date(dto.effectiveTo)
          : null
        : existing.effectiveTo;
    this.assertDateRange(effectiveFrom, effectiveTo);
    await this.assertNoOverlap({
      companyId: existing.companyId,
      designationId,
      employmentTypeId,
      effectiveFrom,
      effectiveTo,
      excludeId: id,
    });

    const updated = await this.prisma.compensationGrid.update({
      where: { id },
      data: {
        ...(dto.designationId !== undefined ? { designationId: dto.designationId } : {}),
        ...(dto.employmentTypeId !== undefined ? { employmentTypeId: dto.employmentTypeId } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: toDecimal(dto.baseSalary) } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom } : {}),
        ...(dto.effectiveTo !== undefined ? { effectiveTo } : {}),
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

  private assertDateRange(effectiveFrom: Date, effectiveTo: Date | null) {
    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom');
    }
  }

  private async assertNoOverlap(params: {
    companyId: string;
    designationId: string;
    employmentTypeId: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    excludeId?: string;
  }) {
    const overlap = await this.prisma.compensationGrid.findFirst({
      where: {
        companyId: params.companyId,
        designationId: params.designationId,
        employmentTypeId: params.employmentTypeId,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        ...(params.effectiveTo ? { effectiveFrom: { lte: params.effectiveTo } } : {}),
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.effectiveFrom } }],
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'An overlapping compensation grid entry already exists for this designation/employment type combination',
      );
    }
  }

  private async ensureDesignation(designationId: string, companyId: string) {
    const row = await this.prisma.designation.findUnique({ where: { id: designationId } });
    if (!row || row.companyId !== companyId) {
      throw new NotFoundException('Designation not found');
    }
    return row;
  }

  private async ensureEmploymentType(employmentTypeId: string, companyId: string) {
    const row = await this.prisma.employmentType.findUnique({ where: { id: employmentTypeId } });
    if (!row || row.companyId !== companyId) {
      throw new NotFoundException('Employment type not found');
    }
    return row;
  }

  private toShape(row: CompensationGridRow) {
    return {
      id: row.id,
      companyId: row.companyId,
      designationId: row.designationId,
      employmentTypeId: row.employmentTypeId,
      baseSalary: fromDecimal(row.baseSalary),
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: row.effectiveTo?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
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
