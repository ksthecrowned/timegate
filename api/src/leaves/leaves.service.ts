import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveApplicationStatus, Prisma, TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { AttendanceDaysService } from '../attendance/attendance-days.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaveBalancesService } from './leave-balances.service';
import { CreateLeaveDto, LegacyLeaveStatus } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';

const DEFAULT_LEAVE_TYPE_NAME = 'Annual Leave';

type LeaveRow = Prisma.LeaveApplicationGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
    leaveType: { select: { id: true; leaveTypeName: true } };
  };
}>;

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private attendanceDays: AttendanceDaysService,
    private leaveBalances: LeaveBalancesService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateLeaveDto, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true, branchId: true, firstName: true, lastName: true, employeeName: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.companyId) {
      throw new BadRequestException('Employee is not linked to a company');
    }
    this.assertCompanyAccess(user, employee.companyId);

    const fromDate = this.toDateOnly(dto.startDate);
    const toDate = this.toDateOnly(dto.endDate);
    if (fromDate > toDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const leaveType = dto.leaveTypeId
      ? await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } })
      : await this.ensureDefaultLeaveType(employee.companyId);
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (leaveType.companyId && leaveType.companyId !== employee.companyId) {
      throw new NotFoundException('Leave type not found');
    }

    const status = this.toApplicationStatus(dto.status);

    if (status === LeaveApplicationStatus.APPROVED) {
      await this.leaveBalances.assertSufficientBalance({
        employeeId: dto.employeeId,
        leaveTypeId: leaveType.id,
        fromDate,
        toDate,
      });
    }

    const created = await this.prisma.leaveApplication.create({
      data: {
        id: generateDocId('LEAVE'),
        employeeId: dto.employeeId,
        companyId: employee.companyId,
        leaveTypeId: leaveType.id,
        fromDate,
        toDate,
        status,
        reason: dto.reason?.trim() || null,
        supportDocumentUrl: dto.supportDocumentUrl?.trim() || null,
      },
      include: {
        employee: { select: employeeSummarySelect },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });

    if (status === LeaveApplicationStatus.APPROVED) {
      await this.attendanceDays.syncEmployeeLeaveDays(
        created.employeeId,
        fromDate,
        toDate,
        employee.companyId,
      );
    }

    if (status === LeaveApplicationStatus.OPEN) {
      await this.notifications.notifyLeaveRequestPending({
        companyId: employee.companyId,
        branchId: employee.branchId,
        employeeId: employee.id,
        employeeName: this.employeeDisplayName(employee),
        leaveId: created.id,
        leaveType: leaveType.leaveTypeName,
        fromDate: fromDate.toISOString().slice(0, 10),
        toDate: toDate.toISOString().slice(0, 10),
      });
    }

    return this.toApiShape(created);
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LeaveApplicationWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.from || query.to
        ? {
            AND: [
              ...(query.to ? [{ fromDate: { lte: this.toDateOnly(query.to) } }] : []),
              ...(query.from ? [{ toDate: { gte: this.toDateOnly(query.from) } }] : []),
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.leaveApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
          leaveType: { select: { id: true, leaveTypeName: true } },
        },
      }),
      this.prisma.leaveApplication.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });
    if (!row) throw new NotFoundException('Leave not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateLeaveDto, user: JwtUser) {
    const current = await this.prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });
    if (!current) throw new NotFoundException('Leave not found');
    this.assertCompanyAccess(user, current.companyId);

    const fromDate =
      dto.startDate !== undefined ? this.toDateOnly(dto.startDate) : current.fromDate;
    const toDate = dto.endDate !== undefined ? this.toDateOnly(dto.endDate) : current.toDate;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    let leaveTypeId = current.leaveTypeId;
    if (dto.leaveTypeId) {
      const lt = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
      if (!lt) throw new NotFoundException('Leave type not found');
      if (lt.companyId && lt.companyId !== current.companyId) {
        throw new NotFoundException('Leave type not found');
      }
      leaveTypeId = lt.id;
    }

    let nextEmployeeId = current.employeeId;
    let nextCompanyId = current.companyId;
    if (dto.employeeId && dto.employeeId !== current.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
        select: { id: true, companyId: true },
      });
      if (!employee) throw new NotFoundException('Employee not found');
      this.assertCompanyAccess(user, employee.companyId);
      if (employee.companyId !== current.companyId) {
        throw new ForbiddenException('Access denied for this company');
      }
      nextEmployeeId = employee.id;
      nextCompanyId = employee.companyId;
    }

    const nextStatus =
      dto.status !== undefined ? this.toApplicationStatus(dto.status) : current.status;

    const effectiveFrom = fromDate ?? current.fromDate;
    const effectiveTo = toDate ?? current.toDate;
    const effectiveEmployeeId = nextEmployeeId;

    if (
      nextStatus === LeaveApplicationStatus.APPROVED &&
      effectiveFrom &&
      effectiveTo
    ) {
      await this.leaveBalances.assertSufficientBalance({
        employeeId: effectiveEmployeeId,
        leaveTypeId,
        fromDate: effectiveFrom,
        toDate: effectiveTo,
        excludeLeaveId: current.status === LeaveApplicationStatus.APPROVED ? id : undefined,
      });
    }

    const updated = await this.prisma.leaveApplication.update({
      where: { id },
      data: {
        ...(dto.employeeId !== undefined
          ? { employeeId: nextEmployeeId, companyId: nextCompanyId }
          : {}),
        leaveTypeId,
        ...(fromDate !== undefined ? { fromDate } : {}),
        ...(toDate !== undefined ? { toDate } : {}),
        status: nextStatus,
        ...(dto.reason !== undefined ? { reason: dto.reason?.trim() || null } : {}),
      },
      include: {
        employee: { select: employeeSummarySelect },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });

    const syncFrom = current.fromDate && updated.fromDate
      ? current.fromDate < updated.fromDate
        ? current.fromDate
        : updated.fromDate
      : current.fromDate ?? updated.fromDate;
    const syncTo = current.toDate && updated.toDate
      ? current.toDate > updated.toDate
        ? current.toDate
        : updated.toDate
      : current.toDate ?? updated.toDate;

    if (
      syncFrom &&
      syncTo &&
      current.companyId &&
      (nextStatus === LeaveApplicationStatus.APPROVED ||
        current.status === LeaveApplicationStatus.APPROVED ||
        dto.status !== undefined)
    ) {
      await this.attendanceDays.syncEmployeeLeaveDays(
        updated.employeeId,
        syncFrom,
        syncTo,
        current.companyId,
      );
    }

    if (
      current.status === LeaveApplicationStatus.OPEN &&
      nextStatus === LeaveApplicationStatus.APPROVED &&
      current.companyId
    ) {
      await this.notifications.notifyLeaveDecision({
        companyId: current.companyId,
        employeeId: updated.employeeId,
        leaveId: updated.id,
        leaveType: updated.leaveType.leaveTypeName,
        fromDate: (updated.fromDate ?? fromDate)!.toISOString().slice(0, 10),
        toDate: (updated.toDate ?? toDate)!.toISOString().slice(0, 10),
        approved: true,
      });
    }

    if (
      current.status === LeaveApplicationStatus.OPEN &&
      nextStatus === LeaveApplicationStatus.REJECTED &&
      current.companyId
    ) {
      await this.notifications.notifyLeaveDecision({
        companyId: current.companyId,
        employeeId: updated.employeeId,
        leaveId: updated.id,
        leaveType: updated.leaveType.leaveTypeName,
        fromDate: (updated.fromDate ?? fromDate)!.toISOString().slice(0, 10),
        toDate: (updated.toDate ?? toDate)!.toISOString().slice(0, 10),
        approved: false,
      });
    }

    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const current = await this.prisma.leaveApplication.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Leave not found');
    this.assertCompanyAccess(user, current.companyId);

    await this.prisma.leaveApplication.delete({ where: { id } });

    if (
      current.status === LeaveApplicationStatus.APPROVED &&
      current.fromDate &&
      current.toDate &&
      current.companyId
    ) {
      await this.attendanceDays.syncEmployeeLeaveDays(
        current.employeeId,
        current.fromDate,
        current.toDate,
        current.companyId,
      );
    }

    return { id, deleted: true };
  }

  private employeeDisplayName(employee: {
    firstName: string | null;
    lastName: string | null;
    employeeName: string | null;
  }): string {
    const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
    return name || employee.employeeName || 'Employé';
  }

  private async ensureDefaultLeaveType(companyId: string) {
    const existing = await this.prisma.leaveType.findFirst({
      where: { companyId, leaveTypeName: DEFAULT_LEAVE_TYPE_NAME },
    });
    if (existing) return existing;

    return this.prisma.leaveType.create({
      data: {
        id: generateDocId('LT'),
        leaveTypeName: DEFAULT_LEAVE_TYPE_NAME,
        companyId,
      },
    });
  }

  private toApplicationStatus(status?: LegacyLeaveStatus): LeaveApplicationStatus {
    switch (status) {
      case LegacyLeaveStatus.APPROVED:
        return LeaveApplicationStatus.APPROVED;
      case LegacyLeaveStatus.REJECTED:
        return LeaveApplicationStatus.REJECTED;
      case LegacyLeaveStatus.PENDING:
      default:
        return LeaveApplicationStatus.OPEN;
    }
  }

  private toLegacyStatus(status: LeaveApplicationStatus): LegacyLeaveStatus {
    switch (status) {
      case LeaveApplicationStatus.APPROVED:
        return LegacyLeaveStatus.APPROVED;
      case LeaveApplicationStatus.REJECTED:
        return LegacyLeaveStatus.REJECTED;
      case LeaveApplicationStatus.OPEN:
      case LeaveApplicationStatus.CANCELLED:
      default:
        return LegacyLeaveStatus.PENDING;
    }
  }

  private toDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toApiShape(row: LeaveRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      startDate: row.fromDate?.toISOString() ?? null,
      endDate: row.toDate?.toISOString() ?? null,
      reason: row.reason,
      supportDocumentUrl: row.supportDocumentUrl,
      status: this.toLegacyStatus(row.status),
      type: row.leaveType.leaveTypeName,
      leaveTypeId: row.leaveTypeId,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
      leaveType: row.leaveType,
    };
  }
}
