import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityQueryDto } from './dto/city-query.dto';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCityDto) {
    const country = await this.prisma.country.findUnique({ where: { id: dto.countryId } });
    if (!country) throw new NotFoundException('Country not found');

    const name = dto.name.trim();
    const existing = await this.prisma.city.findFirst({
      where: { countryId: dto.countryId, name },
    });
    if (existing) throw new ConflictException('City already exists for this country');

    const created = await this.prisma.city.create({
      data: {
        id: generateDocId('CT'),
        name,
        countryId: dto.countryId,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: { country: { select: { id: true, name: true, isoCode: true } } },
    });
    return this.toApiShape(created);
  }

  async findAll(query: CityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const where = {
      ...(query.countryId ? { countryId: query.countryId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        orderBy: [{ country: { name: 'asc' } }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { country: { select: { id: true, name: true, isoCode: true } } },
      }),
      this.prisma.city.count({ where }),
    ]);
    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.city.findUnique({
      where: { id },
      include: { country: { select: { id: true, name: true, isoCode: true } } },
    });
    if (!row) throw new NotFoundException('City not found');
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateCityDto) {
    const current = await this.findOne(id);
    if (dto.countryId) {
      const country = await this.prisma.country.findUnique({ where: { id: dto.countryId } });
      if (!country) throw new NotFoundException('Country not found');
    }
    const nextName = dto.name?.trim() ?? current.name;
    const nextCountryId = dto.countryId ?? current.countryId;
    const clash = await this.prisma.city.findFirst({
      where: { countryId: nextCountryId, name: nextName, NOT: { id } },
    });
    if (clash) throw new ConflictException('City already exists for this country');

    const updated = await this.prisma.city.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      },
      include: { country: { select: { id: true, name: true, isoCode: true } } },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.city.delete({ where: { id } });
    return { id, deleted: true };
  }

  private toApiShape(row: {
    id: string;
    name: string;
    countryId: string;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
    updatedAt: Date;
    country?: { id: string; name: string; isoCode: string };
  }) {
    return {
      id: row.id,
      name: row.name,
      countryId: row.countryId,
      latitude: row.latitude,
      longitude: row.longitude,
      country: row.country,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
