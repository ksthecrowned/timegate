import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCountryDto) {
    const isoCode = dto.isoCode.trim().toUpperCase();
    const existing = await this.prisma.country.findUnique({ where: { isoCode } });
    if (existing) throw new ConflictException('Country ISO code already exists');

    const created = await this.prisma.country.create({
      data: {
        id: generateDocId('CN'),
        name: dto.name.trim(),
        isoCode,
        phoneCode: dto.phoneCode?.trim(),
      },
    });
    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const [items, total] = await Promise.all([
      this.prisma.country.findMany({
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.country.count(),
    ]);
    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.country.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Country not found');
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateCountryDto) {
    await this.findOne(id);
    if (dto.isoCode) {
      const isoCode = dto.isoCode.trim().toUpperCase();
      const clash = await this.prisma.country.findFirst({
        where: { isoCode, NOT: { id } },
      });
      if (clash) throw new ConflictException('Country ISO code already exists');
    }
    const updated = await this.prisma.country.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isoCode !== undefined ? { isoCode: dto.isoCode.trim().toUpperCase() } : {}),
        ...(dto.phoneCode !== undefined ? { phoneCode: dto.phoneCode?.trim() || null } : {}),
      },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.$transaction([
        this.prisma.city.deleteMany({ where: { countryId: id } }),
        this.prisma.country.delete({ where: { id } }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Impossible de supprimer ce pays : des enregistrements y sont encore liés.',
        );
      }
      throw error;
    }
    return { id, deleted: true };
  }

  private toApiShape(row: {
    id: string;
    name: string;
    isoCode: string;
    phoneCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      isoCode: row.isoCode,
      phoneCode: row.phoneCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
