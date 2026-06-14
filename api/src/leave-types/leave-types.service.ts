import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeaveTypeDto, companyId: string) {
    const name = dto.name.trim();
    const existing = await this.prisma.leaveType.findFirst({
      where: { companyId, leaveTypeName: name },
    });
    if (existing) {
      throw new ConflictException('Leave type name already exists for this company');
    }

    const created = await this.prisma.leaveType.create({
      data: {
        id: generateDocId('LTYP'),
        leaveTypeName: name,
        companyId,
        isLwp: dto.isLwp ?? false,
        isCarryForward: dto.isCarryForward ?? false,
        maxDaysPerYear: dto.maxDaysPerYear ?? null,
      },
    });
    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.LeaveTypeWhereInput = {
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.leaveType.findMany({
        where,
        orderBy: { leaveTypeName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaveType.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Leave type not found');
    if (user && row.companyId) this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateLeaveTypeDto, user: JwtUser) {
    const current = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Leave type not found');
    if (!current.companyId) throw new NotFoundException('Leave type company not found');
    this.assertCompanyAccess(user, current.companyId);

    if (dto.name && dto.name.trim() !== current.leaveTypeName) {
      const clash = await this.prisma.leaveType.findFirst({
        where: { companyId: current.companyId, leaveTypeName: dto.name.trim() },
      });
      if (clash) throw new ConflictException('Leave type name already exists for this company');
    }

    const updated = await this.prisma.leaveType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { leaveTypeName: dto.name.trim() } : {}),
        ...(dto.isLwp !== undefined ? { isLwp: dto.isLwp } : {}),
        ...(dto.isCarryForward !== undefined ? { isCarryForward: dto.isCarryForward } : {}),
        ...(dto.maxDaysPerYear !== undefined ? { maxDaysPerYear: dto.maxDaysPerYear } : {}),
      },
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.leaveType.delete({ where: { id } });
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
    leaveTypeName: string;
    companyId: string | null;
    isLwp: boolean;
    isCarryForward: boolean;
    maxDaysPerYear: number | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.leaveTypeName,
      leaveTypeName: row.leaveTypeName,
      companyId: row.companyId,
      isLwp: row.isLwp,
      isCarryForward: row.isCarryForward,
      maxDaysPerYear: row.maxDaysPerYear,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
