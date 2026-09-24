import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { AuditTrailService } from '../audit/audit-trail.service';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { CloseShiftAssignmentDto } from './dto/close-shift-assignment.dto';
import { ShiftAssignmentQueryDto } from './dto/shift-assignment-query.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';

@Injectable()
export class ShiftAssignmentsService {
  constructor(
    private prisma: PrismaService,
    private auditTrail: AuditTrailService,
  ) {}

  async create(dto: CreateShiftAssignmentDto, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true, homeLocationId: true, branchId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const shiftType = await this.prisma.shiftType.findUnique({ where: { id: dto.shiftTypeId } });
    if (!shiftType) throw new NotFoundException('Work schedule not found');
    this.assertCompanyAccess(user, shiftType.companyId);

    if (dto.shiftLocationId) {
      await this.ensureShiftLocationForCompany(dto.shiftLocationId, employee.companyId);
    }

    let locationId = dto.locationId ?? employee.homeLocationId ?? null;
    if (!locationId && employee.branchId) {
      const loc = await this.prisma.timeGateLocation.findUnique({
        where: { branchId: employee.branchId },
        select: { id: true },
      });
      locationId = loc?.id ?? null;
    }
    if (dto.locationId) {
      const loc = await this.prisma.timeGateLocation.findUnique({
        where: { id: dto.locationId },
        select: { id: true, companyId: true },
      });
      if (!loc || loc.companyId !== employee.companyId) {
        throw new NotFoundException('Location not found');
      }
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
        locationId,
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
        ...(dto.locationId !== undefined ? { locationId: dto.locationId || null } : {}),
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

  /**
   * Clôture une affectation (endDate) sans supprimer l’employé.
   * Optionnellement soft-end du contrat courant (fin de mission / mis à disposition).
   */
  async close(id: string, dto: CloseShiftAssignmentDto, user: JwtUser) {
    const current = await this.prisma.shiftAssignment.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!current) throw new NotFoundException('Shift assignment not found');
    this.assertCompanyAccess(user, current.companyId);
    if (!current.companyId) {
      throw new BadRequestException('Affectation sans société');
    }
    const companyId = current.companyId;

    const endDate = dto.endDate
      ? this.toDateOnly(dto.endDate)
      : this.toDateOnly(new Date().toISOString().slice(0, 10));

    if (current.startDate && current.startDate > endDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const before = {
      endDate: current.endDate ? current.endDate.toISOString().slice(0, 10) : null,
    };

    const updated = await this.prisma.shiftAssignment.update({
      where: { id },
      data: { endDate },
      include: this.defaultInclude(),
    });

    let contractEnded: { id: string; expiresAt: string | null } | null = null;
    if (dto.endCurrentContract) {
      const contract = await this.prisma.timeGateEmployeeContract.findFirst({
        where: {
          employeeId: current.employeeId,
          companyId,
          isCurrent: true,
        },
        orderBy: { signedAt: 'desc' },
      });
      if (contract) {
        const ended = await this.prisma.timeGateEmployeeContract.update({
          where: { id: contract.id },
          data: {
            isCurrent: false,
            expiresAt: endDate,
            ...(dto.reason
              ? {
                  notes: [contract.notes, `Clôturé: ${dto.reason.trim()}`]
                    .filter(Boolean)
                    .join(' — ')
                    .slice(0, 2000),
                }
              : {}),
          },
        });
        contractEnded = {
          id: ended.id,
          expiresAt: ended.expiresAt ? ended.expiresAt.toISOString().slice(0, 10) : null,
        };
        await this.auditTrail.record({
          userId: user.sub,
          companyId,
          action: 'CONTRACT_SOFT_END',
          entity: 'TimeGateEmployeeContract',
          entityId: ended.id,
          reason: dto.reason ?? 'Fin de mission / clôture affectation',
          before: { isCurrent: true, expiresAt: contract.expiresAt },
          after: { isCurrent: false, expiresAt: ended.expiresAt },
          extra: { shiftAssignmentId: id, employeeId: current.employeeId },
        });
      }
    }

    await this.auditTrail.record({
      userId: user.sub,
      companyId,
      action: 'SHIFT_ASSIGNMENT_CLOSE',
      entity: 'ShiftAssignment',
      entityId: id,
      reason: dto.reason ?? 'Clôture d’affectation',
      before,
      after: { endDate: endDate.toISOString().slice(0, 10) },
      extra: {
        employeeId: current.employeeId,
        contractEndedId: contractEnded?.id ?? null,
      },
    });

    return {
      ...this.toApiShape(updated),
      closed: true,
      contractEnded,
    };
  }

  private defaultInclude() {
    return {
      employee: { select: employeeSummarySelect },
      shiftType: { select: { id: true, shiftName: true, branchId: true } },
      shiftLocation: { select: { id: true, locationName: true } },
      location: { select: { id: true, name: true, type: true } },
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
      locationId: row.locationId,
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
      location: row.location
        ? { id: row.location.id, name: row.location.name, type: row.location.type }
        : undefined,
    };
  }
}
