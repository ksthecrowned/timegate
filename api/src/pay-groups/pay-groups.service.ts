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

@Injectable()
export class PayGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePayGroupDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const name = dto.name.trim();
    await this.assertUniqueName(companyId, name);

    try {
      const created = await this.prisma.payGroup.create({
        data: {
          id: generateDocId('PGRP'),
          companyId,
          name,
          payDayOfMonth: dto.payDayOfMonth,
        },
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
        orderBy: { name: 'asc' },
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
      const name = dto.name.trim();
      if (name !== existing.name) {
        await this.assertUniqueName(existing.companyId, name);
      }
    }

    const updated = await this.prisma.payGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.payDayOfMonth !== undefined ? { payDayOfMonth: dto.payDayOfMonth } : {}),
      },
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.payGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pay group not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.payGroup.delete({ where: { id } });
    return { id, deleted: true };
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
