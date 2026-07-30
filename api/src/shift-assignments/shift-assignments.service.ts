import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { ShiftAssignmentQueryDto } from './dto/shift-assignment-query.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';

@Injectable()
export class ShiftAssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftAssignmentDto, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const shiftType = await this.prisma.shiftType.findUnique({ where: { id: dto.shiftTypeId } });
    if (!shiftType) throw new NotFoundException('Work schedule not found');
    this.assertCompanyAccess(user, shiftType.companyId);

    if (dto.shiftLocationId) {
      await this.ensureShiftLocationForCompany(dto.shiftLocationId, employee.companyId);
    }

    const startDate = dto.startDate ? this.toDateOnly(dto.startDate) : null;
    const endDate = dto.endDate ? this.toDateOnly(dto.endDate) : null;
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const created = await this.prisma.shiftAssignment.create({
      data: {
        id: generateDocId('SASN'),
        employeeId: employee.id,
        shiftTypeId: shiftType.id,
        shiftLocationId: dto.shiftLocationId ?? null,
        companyId: employee.companyId,
        startDate,
        endDate,
      },
      include: this.defaultInclude(),
    });
    return this.toApiShape(created);
  }

  async findAll(query: ShiftAssignmentQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ShiftAssignmentWhereInput = {
      ...(user.role === PLATFORM_ADMIN ? {} : { companyId: user.companyId }),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.shiftTypeId ? { shiftTypeId: query.shiftTypeId } : {}),
      ...(query.shiftLocationId ? { shiftLocationId: query.shiftLocationId } : {}),
      ...(query.resolvedBranchId()
        ? { employee: { branchId: query.resolvedBranchId() } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shiftAssignment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.defaultInclude(),
      }),
      this.prisma.shiftAssignment.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.shiftAssignment.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!row) throw new NotFoundException('Shift assignment not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateShiftAssignmentDto, user: JwtUser) {
    const current = await this.prisma.shiftAssignment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Shift assignment not found');
    this.assertCompanyAccess(user, current.companyId);

    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
        select: { id: true, companyId: true },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      this.assertCompanyAccess(user, employee.companyId);
    }
    if (dto.shiftTypeId) {
      const shiftType = await this.prisma.shiftType.findUnique({ where: { id: dto.shiftTypeId } });
      if (!shiftType) throw new NotFoundException('Work schedule not found');
      this.assertCompanyAccess(user, shiftType.companyId);
    }
    if (dto.shiftLocationId) {
      await this.ensureShiftLocationForCompany(dto.shiftLocationId, current.companyId);
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? this.toDateOnly(dto.startDate)
          : null
        : undefined;
    const endDate =
      dto.endDate !== undefined ? (dto.endDate ? this.toDateOnly(dto.endDate) : null) : undefined;
    const nextStart = startDate !== undefined ? startDate : current.startDate;
    const nextEnd = endDate !== undefined ? endDate : current.endDate;
    if (nextStart && nextEnd && nextStart > nextEnd) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const updated = await this.prisma.shiftAssignment.update({
      where: { id },
      data: {
        ...(dto.employeeId !== undefined ? { employeeId: dto.employeeId } : {}),
        ...(dto.shiftTypeId !== undefined ? { shiftTypeId: dto.shiftTypeId } : {}),
        ...(dto.shiftLocationId !== undefined ? { shiftLocationId: dto.shiftLocationId } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
      },
      include: this.defaultInclude(),
    });
    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.shiftAssignment.delete({ where: { id } });
    return { id, deleted: true };
  }

  private defaultInclude() {
    return {
      employee: { select: employeeSummarySelect },
      shiftType: { select: { id: true, shiftName: true, branchId: true } },
      shiftLocation: { select: { id: true, locationName: true } },
    } as const;
  }

  private async ensureShiftLocation(id: string) {
    const row = await this.prisma.shiftLocation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Shift location not found');
    return row;
  }

  private async ensureShiftLocationForCompany(id: string, companyId: string | null) {
    const row = await this.ensureShiftLocation(id);
    if (!companyId) {
      throw new NotFoundException('Shift location not found');
    }
    if (!row.branchId) {
      throw new BadRequestException('Shift location has no branch assignment');
    }
    const branch = await this.prisma.branch.findUnique({
      where: { id: row.branchId },
      select: { companyId: true },
    });
    if (!branch || branch.companyId !== companyId) {
      throw new NotFoundException('Shift location not found');
    }
    return row;
  }

  private toDateOnly(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new NotFoundException('Shift assignment not found');
    }
  }

  private toApiShape(
    row: Prisma.ShiftAssignmentGetPayload<{ include: ReturnType<ShiftAssignmentsService['defaultInclude']> }>,
  ) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      shiftTypeId: row.shiftTypeId,
      shiftLocationId: row.shiftLocationId,
      companyId: row.companyId,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      endDate: row.endDate ? row.endDate.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
      shiftType: row.shiftType
        ? { id: row.shiftType.id, name: row.shiftType.shiftName, branchId: row.shiftType.branchId }
        : undefined,
      shiftLocation: row.shiftLocation
        ? { id: row.shiftLocation.id, name: row.shiftLocation.locationName }
        : undefined,
    };
  }
}
