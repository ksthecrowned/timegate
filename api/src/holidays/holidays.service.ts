import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

type HolidayRow = Prisma.HolidayGetPayload<{
  include: {
    holidayList: {
      include: { company: { select: { id: true; name: true; sku: true } } };
    };
  };
}>;

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHolidayDto) {
    const companyId = dto.companyId.trim();
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Organization not found');

    const list = await this.ensureHolidayList(companyId, company.name ?? 'Company');

    const created = await this.prisma.holiday.create({
      data: {
        id: generateDocId('HOL'),
        parentId: list.id,
        description: dto.name.trim(),
        holidayDate: this.toDateOnly(dto.date),
      },
      include: {
        holidayList: { include: { company: { select: { id: true, name: true, sku: true } } } },
      },
    });

    return this.toApiShape(created);
  }

  async findAllLists(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.HolidayListWhereInput = {
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.holidayList.findMany({
        where,
        orderBy: { holidayListName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.holidayList.count({ where }),
    ]);

    return {
      data: items.map((row) => ({
        id: row.id,
        name: row.holidayListName,
        holidayListName: row.holidayListName,
        companyId: row.companyId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        company: row.company
          ? { id: row.company.id, name: row.company.name ?? row.company.id, sku: row.company.sku }
          : undefined,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.HolidayWhereInput = {
      ...(companyId
        ? { holidayList: { companyId } }
        : {}),
      ...(query.from || query.to
        ? {
            holidayDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.holiday.findMany({
        where,
        orderBy: { holidayDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          holidayList: { include: { company: { select: { id: true, name: true, sku: true } } } },
        },
      }),
      this.prisma.holiday.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        holidayList: { include: { company: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Holiday not found');
    const companyId = row.holidayList.companyId ?? row.holidayList.company?.id;
    if (!companyId) throw new NotFoundException('Holiday company not found');
    this.assertCompanyAccess(user, companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateHolidayDto, user: JwtUser) {
    const existing = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        holidayList: { include: { company: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!existing) throw new NotFoundException('Holiday not found');
    const companyId = existing.holidayList.companyId ?? existing.holidayList.company?.id;
    if (!companyId) throw new NotFoundException('Holiday company not found');
    this.assertCompanyAccess(user, companyId);

    const updated = await this.prisma.holiday.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { description: dto.name.trim() } : {}),
        ...(dto.date !== undefined ? { holidayDate: this.toDateOnly(dto.date) } : {}),
      },
      include: {
        holidayList: { include: { company: { select: { id: true, name: true, sku: true } } } },
      },
    });

    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.holiday.findUnique({
      where: { id },
      include: { holidayList: true },
    });
    if (!existing) throw new NotFoundException('Holiday not found');
    this.assertCompanyAccess(user, existing.holidayList.companyId);
    await this.prisma.holiday.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureHolidayList(companyId: string, companyName: string) {
    const existing = await this.prisma.holidayList.findUnique({ where: { companyId } });
    if (existing) return existing;

    return this.prisma.holidayList.create({
      data: {
        id: generateDocId('HLIST'),
        holidayListName: `${companyName} Holidays`,
        companyId,
      },
    });
  }

  private toDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private toApiShape(row: HolidayRow) {
    const company = row.holidayList.company;
    const companyId = row.holidayList.companyId ?? company?.id ?? null;

    return {
      id: row.id,
      companyId,
      holidayListId: row.parentId ?? row.holidayList.id,
      holidayListName: row.holidayList.holidayListName,
      name: row.description ?? '',
      date: row.holidayDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      company: company
        ? { id: company.id, name: company.name ?? company.id, sku: company.sku }
        : undefined,
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }
}
