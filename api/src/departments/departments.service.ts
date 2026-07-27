import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto, companyId: string) {
    const name = dto.name.trim();
    const existing = await this.prisma.department.findFirst({
      where: { companyId, departmentName: name },
    });
    if (existing) {
      throw new ConflictException('Department name already exists for this company');
    }

    const created = await this.prisma.department.create({
      data: {
        id: generateDocId('DEPT'),
        departmentName: name,
        companyId,
        code: dto.code?.trim(),
        description: dto.description?.trim(),
        parentDepartmentId: dto.parentDepartmentId,
      },
    });
    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DepartmentWhereInput = {
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { departmentName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.department.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Department not found');
    if (user) this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateDepartmentDto, user: JwtUser) {
    const current = await this.prisma.department.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Department not found');
    this.assertCompanyAccess(user, current.companyId);

    if (dto.name && dto.name.trim() !== current.departmentName) {
      const clash = await this.prisma.department.findFirst({
        where: { companyId: current.companyId, departmentName: dto.name.trim() },
      });
      if (clash) throw new ConflictException('Department name already exists for this company');
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { departmentName: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.parentDepartmentId !== undefined
          ? { parentDepartmentId: dto.parentDepartmentId || null }
          : {}),
      },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.department.delete({ where: { id } });
    return { id, deleted: true };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(row: {
    id: string;
    departmentName: string;
    companyId: string;
    code: string | null;
    description: string | null;
    parentDepartmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.departmentName,
      code: row.code,
      description: row.description,
      parentDepartmentId: row.parentDepartmentId,
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
