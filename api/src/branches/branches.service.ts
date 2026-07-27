import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateBranchDto, companyId: string) {
    return this.prisma.branch
      .create({
        data: this.buildCreateData(dto, companyId),
        include: this.branchIncludes(),
      })
      .then((b) => this.toApiShape(b));
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.resolvedBranchId();
    const where = {
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { id: branchId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        orderBy: { branchName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.branchIncludes(),
      }),
      this.prisma.branch.count({ where }),
    ]);
    return {
      data: items.map((b) => this.toApiShape(b)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: this.branchIncludes(),
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    if (user) {
      this.assertCompanyAccess(user, branch.companyId);
    }
    return this.toApiShape(branch);
  }

  async update(id: string, dto: UpdateBranchDto, user: JwtUser) {
    await this.findOne(id, user);
    const updated = await this.prisma.branch.update({
      where: { id },
      data: this.buildUpdateData(dto),
      include: this.branchIncludes(),
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.branch.delete({ where: { id } });
    return { id, deleted: true };
  }

  private branchIncludes() {
    return {
      city: { select: { id: true, name: true, countryId: true } },
      country: { select: { id: true, name: true, isoCode: true } },
    } as const;
  }

  private buildCreateData(dto: CreateBranchDto, companyId: string): Prisma.BranchCreateInput {
    return {
      id: generateDocId('BR'),
      branchName: dto.name.trim(),
      company: { connect: { id: companyId } },
      address: dto.address,
      timeZone: dto.timezone ?? 'Africa/Brazzaville',
      branchCode: dto.branchCode?.trim(),
      ...(dto.cityId ? { city: { connect: { id: dto.cityId } } } : {}),
      ...(dto.countryId ? { country: { connect: { id: dto.countryId } } } : {}),
      latitude: dto.latitude,
      longitude: dto.longitude,
      checkinRadius: dto.checkinRadius,
      phone: dto.phone?.trim(),
      email: dto.email?.trim(),
      isHeadOffice: dto.isHeadOffice ?? false,
      isActive: dto.isActive ?? true,
    };
  }

  private buildUpdateData(dto: UpdateBranchDto): Prisma.BranchUpdateInput {
    return {
      ...(dto.name !== undefined ? { branchName: dto.name.trim() } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.timezone !== undefined ? { timeZone: dto.timezone } : {}),
      ...(dto.branchCode !== undefined ? { branchCode: dto.branchCode?.trim() || null } : {}),
      ...(dto.cityId !== undefined
        ? dto.cityId
          ? { city: { connect: { id: dto.cityId } } }
          : { city: { disconnect: true } }
        : {}),
      ...(dto.countryId !== undefined
        ? dto.countryId
          ? { country: { connect: { id: dto.countryId } } }
          : { country: { disconnect: true } }
        : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.checkinRadius !== undefined ? { checkinRadius: dto.checkinRadius } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
      ...(dto.isHeadOffice !== undefined ? { isHeadOffice: dto.isHeadOffice } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(branch: {
    id: string;
    branchName: string;
    companyId: string;
    address: string | null;
    timeZone: string;
    branchCode: string | null;
    cityId: string | null;
    countryId: string | null;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    checkinRadius: number | null;
    phone: string | null;
    email: string | null;
    isHeadOffice: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    city?: { id: string; name: string; countryId: string } | null;
    country?: { id: string; name: string; isoCode: string } | null;
  }) {
    return {
      id: branch.id,
      name: branch.branchName,
      branchCode: branch.branchCode,
      address: branch.address,
      timezone: branch.timeZone,
      cityId: branch.cityId,
      countryId: branch.countryId,
      latitude: branch.latitude != null ? Number(branch.latitude) : null,
      longitude: branch.longitude != null ? Number(branch.longitude) : null,
      checkinRadius: branch.checkinRadius,
      phone: branch.phone,
      email: branch.email,
      isHeadOffice: branch.isHeadOffice,
      isActive: branch.isActive,
      city: branch.city ? { id: branch.city.id, name: branch.city.name } : null,
      country: branch.country
        ? { id: branch.country.id, name: branch.country.name, isoCode: branch.country.isoCode }
        : null,
      companyId: branch.companyId,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }
}
