import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class DesignationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDesignationDto, companyId: string) {
    const name = dto.name.trim();
    const existing = await this.prisma.designation.findFirst({
      where: { companyId, designationName: name },
    });
    if (existing) {
      throw new ConflictException('Designation name already exists for this company');
    }

    const created = await this.prisma.designation.create({
      data: {
        id: generateDocId('DESIG'),
        designationName: name,
        companyId,
        description: dto.description?.trim(),
        grade: dto.grade?.trim(),
      },
    });
    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DesignationWhereInput = {
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.designation.findMany({
        where,
        orderBy: { designationName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.designation.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.designation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Designation not found');
    if (user) this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateDesignationDto, user: JwtUser) {
    const current = await this.prisma.designation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Designation not found');
    this.assertCompanyAccess(user, current.companyId);

    if (dto.name && dto.name.trim() !== current.designationName) {
      const clash = await this.prisma.designation.findFirst({
        where: { companyId: current.companyId, designationName: dto.name.trim() },
      });
      if (clash) throw new ConflictException('Designation name already exists for this company');
    }

    const updated = await this.prisma.designation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { designationName: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade?.trim() || null } : {}),
      },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.designation.delete({ where: { id } });
    return { id, deleted: true };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(row: {
    id: string;
    designationName: string;
    companyId: string;
    description: string | null;
    grade: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.designationName,
      description: row.description,
      grade: row.grade,
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
