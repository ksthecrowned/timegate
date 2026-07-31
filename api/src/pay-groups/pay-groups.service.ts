import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';

type PayGroupRow = Prisma.PayGroupGetPayload<object>;
type DbClient = Prisma.TransactionClient | PrismaService;

const DEFAULT_PAY_GROUP_NAME = 'Paie mensuelle';
const DEFAULT_PAY_DAY = 25;

@Injectable()
export class PayGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePayGroupDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const name = this.normalizeName(dto.name);
    if (!name) throw new BadRequestException('Pay group name is required');
    await this.assertUniqueName(companyId, name);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const existingCount = await tx.payGroup.count({ where: { companyId } });
        const makeDefault = dto.isDefault === true || existingCount === 0;

        if (makeDefault) {
          await tx.payGroup.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.payGroup.create({
          data: {
            id: generateDocId('PGRP'),
            companyId,
            name,
            payDayOfMonth: dto.payDayOfMonth,
            isDefault: makeDefault,
          },
        });
      });
      return this.toShape(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Pay group name already exists for this company');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.PayGroupWhereInput = {
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payGroup.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payGroup.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.payGroup.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Pay group not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toShape(row);
  }

  async update(id: string, dto: UpdatePayGroupDto, user: JwtUser) {
    const existing = await this.prisma.payGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pay group not found');
    this.assertCompanyAccess(user, existing.companyId);

    if (dto.name !== undefined) {
      const name = this.normalizeName(dto.name);
      if (!name) throw new BadRequestException('Pay group name is required');
      if (name !== existing.name) {
        await this.assertUniqueName(existing.companyId, name);
      }
    }

    if (dto.isDefault === false && existing.isDefault) {
      const otherDefault = await this.prisma.payGroup.findFirst({
        where: { companyId: existing.companyId, isDefault: true, NOT: { id } },
      });
      if (!otherDefault) {
        throw new BadRequestException(
          'Impossible de retirer le statut par défaut sans désigner un autre groupe.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.payGroup.updateMany({
          where: { companyId: existing.companyId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.payGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: this.normalizeName(dto.name) } : {}),
          ...(dto.payDayOfMonth !== undefined ? { payDayOfMonth: dto.payDayOfMonth } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.payGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pay group not found');
    this.assertCompanyAccess(user, existing.companyId);

    const total = await this.prisma.payGroup.count({ where: { companyId: existing.companyId } });
    if (total <= 1) {
      throw new BadRequestException('Impossible de supprimer le dernier groupe de paie.');
    }

    await this.prisma.$transaction(async (tx) => {
      let fallback = await tx.payGroup.findFirst({
        where: {
          companyId: existing.companyId,
          NOT: { id },
          isDefault: true,
        },
      });
      if (!fallback) {
        fallback = await tx.payGroup.findFirst({
          where: { companyId: existing.companyId, NOT: { id } },
          orderBy: { createdAt: 'asc' },
        });
      }
      if (!fallback) {
        throw new BadRequestException('Impossible de supprimer le dernier groupe de paie.');
      }

      if (existing.isDefault && !fallback.isDefault) {
        await tx.payGroup.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        });
      }

      await tx.employee.updateMany({
        where: { companyId: existing.companyId, payGroupId: id },
        data: { payGroupId: fallback.id },
      });

      await tx.payGroup.delete({ where: { id } });
    });

    return { id, deleted: true };
  }

  /**
   * Ensures the company has a default pay group (creates « Paie mensuelle » / day 25 if needed).
   * Used by signup and employee assignment.
   */
  async ensureDefaultForCompany(companyId: string, client: DbClient = this.prisma) {
    const existingDefault = await client.payGroup.findFirst({
      where: { companyId, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existingDefault) return existingDefault;

    const anyGroup = await client.payGroup.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    if (anyGroup) {
      return client.payGroup.update({
        where: { id: anyGroup.id },
        data: { isDefault: true },
      });
    }

    return client.payGroup.create({
      data: {
        id: generateDocId('PGRP'),
        companyId,
        name: DEFAULT_PAY_GROUP_NAME,
        payDayOfMonth: DEFAULT_PAY_DAY,
        isDefault: true,
      },
    });
  }

  private normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private async assertUniqueName(companyId: string, name: string) {
    const existing = await this.prisma.payGroup.findFirst({
      where: { companyId, name },
    });
    if (existing) {
      throw new ConflictException('Pay group name already exists for this company');
    }
  }

  private toShape(row: PayGroupRow) {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      payDayOfMonth: row.payDayOfMonth,
      isDefault: row.isDefault,
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
