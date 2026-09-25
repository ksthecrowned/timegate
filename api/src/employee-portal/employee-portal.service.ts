import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  EmployeeStatus,
  LeaveApplicationStatus,
  Prisma,
  TimeGateAttendanceEventStatus,
  TimeGatePayrollRunStatus,
  TimeGatePunchClaimStatus,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveBalanceQueryDto } from '../leaves/dto/leave-balance-query.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { PunchWindowService } from '../attendance/punch-window.service';
import { LeavesService } from '../leaves/leaves.service';
import { LeaveBalancesService } from '../leaves/leave-balances.service';
import { LeaveTypesService } from '../leave-types/leave-types.service';
import { LegacyLeaveStatus } from '../leaves/dto/create-leave.dto';
import { CreateSelfLeaveDto } from './dto/create-self-leave.dto';
import { CreateSelfShiftSwapDto } from './dto/create-self-shift-swap.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ShiftSwapsService } from '../shift-swaps/shift-swaps.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { FindAttendanceEventsQueryDto } from '../attendance/dto/find-attendance-events-query.dto';
import { PunchClaimsService } from '../punch-claims/punch-claims.service';
import { CreatePunchClaimDto } from '../punch-claims/dto/punch-claim.dto';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { holidayDateKey } from '../common/utils/holiday-calendar.util';
import { TrustedDevicesService } from '../trusted-devices/trusted-devices.service';
import { TimesheetsService } from '../timesheets/timesheets.service';
import { FindTimesheetsQueryDto } from '../timesheets/dto/find-timesheets-query.dto';
import { fromDecimal } from '../common/utils/money.util';
import {
  FindColleaguesQueryDto,
  FindMyTimesheetsQueryDto,
} from './dto/find-my-self-service.dto';

import type { UploadedFile } from '../common/upload/uploaded-file';
@Injectable()
export class EmployeePortalService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private punchWindows: PunchWindowService,
    private leaves: LeavesService,
    private leaveBalances: LeaveBalancesService,
    private leaveTypes: LeaveTypesService,
    private shiftSwaps: ShiftSwapsService,
    private punchClaims: PunchClaimsService,
    private storage: CloudflareR2Service,
    private trustedDevices: TrustedDevicesService,
    private timesheets: TimesheetsService,
  ) {}

  async getProfile(user: JwtUser) {
    const employeeId = user.employeeId!;
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        personalEmail: true,
        cellNumber: true,
        status: true,
        branchId: true,
        departmentId: true,
        designationId: true,
        companyId: true,
        branch: { select: { id: true, branchName: true } },
        department: { select: { id: true, departmentName: true } },
        designation: { select: { id: true, designationName: true } },
        defaultShift: { select: { id: true, shiftName: true } },
        user: { select: { language: true, email: true } },
        company: { select: { id: true, name: true, sku: true, countryCode: true } },
        salaryCurrency: true,
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const deviceTrust = await this.trustedDevices.resolveTrustLevel(user);

    return {
      id: employee.id,
      firstName: employee.firstName ?? employee.employeeName,
      lastName: employee.lastName ?? '',
      email: employee.personalEmail,
      loginEmail: employee.user?.email ?? null,
      phone: employee.cellNumber,
      status: employee.status,
      branchId: employee.branchId,
      branchName: employee.branch?.branchName ?? null,
      departmentId: employee.departmentId,
      department: employee.department?.departmentName ?? null,
      designationId: employee.designationId,
      position: employee.designation?.designationName ?? null,
      defaultShiftName: employee.defaultShift?.shiftName ?? null,
      companyId: employee.companyId,
      organizationName: employee.company?.name ?? null,
      organizationSku: employee.company?.sku ?? null,
      countryCode: employee.company?.countryCode ?? null,
      currencyCode: this.resolveEmployeeCurrency(
        employee.salaryCurrency,
        employee.company?.countryCode,
      ),
      language: employee.user?.language ?? null,
      deviceTrust,
    };
  }

  private resolveEmployeeCurrency(
    salaryCurrency?: string | null,
    countryCode?: string | null,
  ): string {
    const fromSalary = salaryCurrency?.trim().toUpperCase();
    if (fromSalary && /^[A-Z]{3}$/.test(fromSalary)) return fromSalary;
    const country = countryCode?.trim().toUpperCase();
    const byCountry: Record<string, string> = {
      SN: 'XOF',
      CI: 'XOF',
      BF: 'XOF',
      ML: 'XOF',
      NE: 'XOF',
      TG: 'XOF',
      BJ: 'XOF',
      GW: 'XOF',
      CM: 'XAF',
      GA: 'XAF',
      CG: 'XAF',
      TD: 'XAF',
      CF: 'XAF',
      GQ: 'XAF',
      CD: 'CDF',
      MA: 'MAD',
      TN: 'TND',
      DZ: 'DZD',
      NG: 'NGN',
      GH: 'GHS',
      KE: 'KES',
      ZA: 'ZAR',
    };
    return (country && byCountry[country]) || 'XAF';
  }

  findMyCheckins(user: JwtUser, query: PaginationQueryDto) {
    const scoped = Object.assign(new PaginationQueryDto(), query, {
      employeeId: user.employeeId!,
    });
    return this.attendance.findCheckins(scoped, user);
  }

  findMyAttendanceEvents(user: JwtUser, query: PaginationQueryDto) {
    const scoped = Object.assign(new FindAttendanceEventsQueryDto(), query, {
      employeeId: user.employeeId!,
    });
    return this.attendance.findEvents(scoped, user);
  }

  findMyPunchClaims(user: JwtUser, query: PaginationQueryDto) {
    return this.punchClaims.findAll(
      Object.assign({ page: 1, limit: 20, employeeId: user.employeeId! }, query),
      user,
    );
  }

  createPunchClaim(user: JwtUser, dto: CreatePunchClaimDto) {
    return this.punchClaims.createForEmployee(user, dto);
  }

  async findMyContracts(user: JwtUser, query: PaginationQueryDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);

    const [items, total] = await Promise.all([
      this.prisma.timeGateEmployeeContract.findMany({
        where: { employeeId },
        orderBy: [{ isCurrent: 'desc' }, { signedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.timeGateEmployeeContract.count({ where: { employeeId } }),
    ]);

    return {
      data: items.map((row) => ({
        id: row.id,
        signedAt: row.signedAt.toISOString(),
        expiresAt: row.expiresAt ? row.expiresAt.toISOString().slice(0, 10) : null,
        renewalsCount: row.renewalsCount,
        contractFileUrl: row.contractFileUrl,
        notes: row.notes,
        isCurrent: row.isCurrent,
        createdAt: row.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  findMyLeaves(user: JwtUser, query: PaginationQueryDto) {
    const scoped = Object.assign(new PaginationQueryDto(), query, {
      employeeId: user.employeeId!,
    });
    return this.leaves.findAll(scoped, user.companyId ?? undefined);
  }

  createLeaveRequest(user: JwtUser, dto: CreateSelfLeaveDto, file?: UploadedFile) {
    return this.createLeaveRequestWithDocument(user, dto, file);
  }

  async createLeaveRequestWithDocument(
    user: JwtUser,
    dto: CreateSelfLeaveDto,
    file?: UploadedFile,
  ) {
    const employeeId = user.employeeId!;
    let supportDocumentUrl: string | undefined;

    if (file) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      });
      if (!employee?.companyId) throw new NotFoundException('Employee not found');

      const uploaded = await this.storage.uploadLeaveSupportDocument({
        organizationId: employee.companyId,
        employeeId,
        contentType: file.mimetype,
        buffer: file.buffer,
      });
      if (!uploaded) {
        throw new BadRequestException('Stockage indisponible — réessayez plus tard');
      }
      supportDocumentUrl = uploaded;
    }

    return this.leaves.create(
      {
        employeeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason,
        leaveTypeId: dto.leaveTypeId,
        status: LegacyLeaveStatus.PENDING,
        supportDocumentUrl,
      },
      user,
    );
  }

  getMyLeaveBalances(user: JwtUser, query: LeaveBalanceQueryDto) {
    return this.leaveBalances.getEmployeeBalances(user.employeeId!, query.year);
  }

  async getLeaveTypes(user: JwtUser) {
    const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 100 });
    const result = await this.leaveTypes.findAll(query, user.companyId ?? undefined);
    return { data: result.data };
  }

  /** Update the linked Employee + User record for the current employee. */
  async updateMyProfile(user: JwtUser, dto: UpdateMyProfileDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.companyId && user.companyId && employee.companyId !== user.companyId) {
      throw new ForbiddenException('Cross-company access denied');
    }

    const employeeData: Record<string, unknown> = {};
    if (dto.phone !== undefined) employeeData.cellNumber = dto.phone;
    if (dto.email !== undefined) employeeData.personalEmail = dto.email;

    const userData: Record<string, unknown> = {};
    if (dto.firstName !== undefined) userData.firstName = dto.firstName;
    if (dto.lastName !== undefined) userData.lastName = dto.lastName;
    if (dto.language !== undefined) userData.language = dto.language;

    await this.prisma.$transaction([
      ...(Object.keys(employeeData).length > 0
        ? [this.prisma.employee.update({ where: { id: employeeId }, data: employeeData })]
        : []),
      ...(employee.userId && Object.keys(userData).length > 0
        ? [this.prisma.user.update({ where: { id: employee.userId }, data: userData })]
        : []),
    ]);

    return this.getProfile(user);
  }

  /** Employee self-service shift swap. Uses ShiftSwapsService.create under the hood,
   *  mapping `user.employeeId` to the DTO's requesterEmployeeId. */
  async createShiftSwap(user: JwtUser, dto: CreateSelfShiftSwapDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    return this.shiftSwaps.create(
      {
        requesterEmployeeId: employeeId,
        targetEmployeeId: dto.targetEmployeeId,
        shiftAssignmentId: dto.shiftAssignmentId,
        swapDate: dto.swapDate,
        reason: dto.reason,
      },
      user,
    );
  }

  /**
   * Statut planning du jour : affectation employé → horaire défaut employé →
   * défaut entreprise, plus congé / férié. Aligné sur PunchWindowService.
   */
  async getTodaySchedule(user: JwtUser) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const now = new Date();
    const date = holidayDateKey(now);
    const dayStart = new Date(`${date}T00:00:00.000Z`);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true, holidayListId: true },
    });
    if (!employee?.companyId) {
      throw new NotFoundException('Employee not found');
    }

    const leave = await this.prisma.leaveApplication.findFirst({
      where: {
        employeeId,
        status: LeaveApplicationStatus.APPROVED,
        fromDate: { lte: dayStart },
        toDate: { gte: dayStart },
      },
      include: { leaveType: { select: { leaveTypeName: true } } },
      orderBy: { fromDate: 'desc' },
    });

    let holidayName: string | null = null;
    const listId =
      employee.holidayListId ??
      (
        await this.prisma.holidayList.findFirst({
          where: { companyId: employee.companyId },
          select: { id: true },
        })
      )?.id;
    if (listId) {
      const holiday = await this.prisma.holiday.findFirst({
        where: { parentId: listId, holidayDate: dayStart },
        select: { description: true },
      });
      if (holiday) {
        holidayName = holiday.description?.trim() || 'Férié';
      }
    }

    const schedule = await this.punchWindows.resolveScheduleForEmployee(
      employeeId,
      now,
    );

    if (leave) {
      return {
        date,
        kind: 'leave' as const,
        isWorkDay: false,
        leaveType: leave.leaveType?.leaveTypeName ?? 'Congé',
        holidayName: null,
        shift: null,
        scheduleSource: schedule.source,
      };
    }

    if (holidayName) {
      return {
        date,
        kind: 'holiday' as const,
        isWorkDay: false,
        leaveType: null,
        holidayName,
        shift: null,
        scheduleSource: schedule.source,
      };
    }

    if (!schedule.isWorkDay) {
      return {
        date,
        kind: 'off' as const,
        isWorkDay: false,
        leaveType: null,
        holidayName: null,
        shift: schedule.shiftName
          ? {
              name: schedule.shiftName,
              startTime: null,
              endTime: null,
              source: schedule.source,
            }
          : null,
        scheduleSource: schedule.source,
      };
    }

    return {
      date,
      kind: 'scheduled' as const,
      isWorkDay: true,
      leaveType: null,
      holidayName: null,
      shift: {
        name: schedule.shiftName ?? 'Shift',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        source: schedule.source,
      },
      scheduleSource: schedule.source,
    };
  }

  async findColleagues(user: JwtUser, query: FindColleaguesQueryDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');
    if (!user.companyId) throw new ForbiddenException('No company context');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const q = query.q?.trim();

    const where: Prisma.EmployeeWhereInput = {
      companyId: user.companyId,
      status: EmployeeStatus.ACTIVE,
      id: { not: employeeId },
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { employeeName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeName: true,
          branchId: true,
          branch: { select: { branchName: true } },
          designation: { select: { designationName: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: items.map((row) => ({
        id: row.id,
        firstName: row.firstName ?? row.employeeName ?? '',
        lastName: row.lastName ?? '',
        branchId: row.branchId,
        branchName: row.branch?.branchName ?? null,
        position: row.designation?.designationName ?? null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMyTimesheets(user: JwtUser, query: FindMyTimesheetsQueryDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const scoped = Object.assign(new FindTimesheetsQueryDto(), query, {
      employeeId,
      branchId: undefined,
    });
    const result = await this.timesheets.findAll(scoped, user);
    return {
      data: result.data.map((row) => this.toEmployeeTimesheetShape(row)),
      meta: result.meta,
    };
  }

  async findMyTimesheet(user: JwtUser, id: string) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const row = await this.timesheets.findOne(id, user);
    if (row.employeeId !== employeeId) {
      throw new ForbiddenException('Access denied');
    }
    return this.toEmployeeTimesheetShape(row);
  }

  async getMyPayrollSummary(user: JwtUser, query: PaginationQueryDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 24);

    const where: Prisma.TimeGatePayrollLineWhereInput = {
      employeeId,
      payrollRun: { status: { not: TimeGatePayrollRunStatus.DRAFT } },
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGatePayrollLine.findMany({
        where,
        orderBy: [
          { payrollRun: { year: 'desc' } },
          { payrollRun: { month: 'desc' } },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          payrollRun: {
            select: {
              id: true,
              year: true,
              month: true,
              status: true,
              lockedAt: true,
              paidAt: true,
            },
          },
        },
      }),
      this.prisma.timeGatePayrollLine.count({ where }),
    ]);

    const data = items.map((row) => this.toEmployeePayrollLineShape(row));
    return {
      data,
      latest: data[0] ?? null,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      disclaimer:
        'Montants de préparation TimeGate. La paie réglementaire reste du ressort de votre RH / outil de paie.',
    };
  }

  async getMyPayrollLine(user: JwtUser, id: string) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const row = await this.prisma.timeGatePayrollLine.findUnique({
      where: { id },
      include: {
        payrollRun: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true,
            lockedAt: true,
            paidAt: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Payroll line not found');
    if (row.employeeId !== employeeId) throw new ForbiddenException('Access denied');
    if (row.payrollRun.status === TimeGatePayrollRunStatus.DRAFT) {
      throw new ForbiddenException('Payroll run not available');
    }
    return {
      ...this.toEmployeePayrollLineShape(row),
      disclaimer:
        'Montants de préparation TimeGate. La paie réglementaire reste du ressort de votre RH / outil de paie.',
    };
  }

  async getPendingHr(user: JwtUser) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const [claims, events, timesheets] = await Promise.all([
      this.prisma.timeGatePunchClaim.findMany({
        where: { employeeId, status: TimeGatePunchClaimStatus.OPEN },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          reason: true,
          status: true,
          workDate: true,
          createdAt: true,
        },
      }),
      this.prisma.timeGateAttendanceEvent.findMany({
        where: {
          employeeId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
        },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          occurredAt: true,
          authMethod: true,
        },
      }),
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          employeeId,
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
        },
        orderBy: { workDate: 'desc' },
        take: 20,
        select: {
          id: true,
          workDate: true,
          status: true,
          workedMinutes: true,
          lateMinutes: true,
          anomalyFlags: true,
        },
      }),
    ]);

    const items = [
      ...claims.map((c) => ({
        kind: 'PUNCH_CLAIM' as const,
        id: c.id,
        title: 'Réclamation de pointage',
        subtitle: c.reason,
        status: c.status,
        workDate: c.workDate.toISOString().slice(0, 10),
        createdAt: c.createdAt.toISOString(),
        href: '/punch-claims',
      })),
      ...events.map((e) => ({
        kind: 'ATTENDANCE_EVENT' as const,
        id: e.id,
        title: 'Pointage en revue',
        subtitle: `${e.type}${e.authMethod ? ` · ${e.authMethod}` : ''}`,
        status: e.status,
        workDate: e.occurredAt.toISOString().slice(0, 10),
        createdAt: e.occurredAt.toISOString(),
        href: '/attendance',
      })),
      ...timesheets.map((t) => ({
        kind: 'TIMESHEET' as const,
        id: t.id,
        title: 'Feuille de temps en revue',
        subtitle:
          t.lateMinutes > 0
            ? `${Math.round(t.workedMinutes / 60)} h · retard ${t.lateMinutes} min`
            : `${Math.round(t.workedMinutes / 60)} h`,
        status: t.status,
        workDate: t.workDate.toISOString().slice(0, 10),
        createdAt: t.workDate.toISOString(),
        href: `/timesheets/${t.id}`,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      data: items,
      meta: {
        total: items.length,
        claims: claims.length,
        events: events.length,
        timesheets: timesheets.length,
      },
    };
  }

  async getHomeInsights(user: JwtUser) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const now = new Date();
    const day = now.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
    );
    const sunday = new Date(
      Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6),
    );
    const todayKey = now.toISOString().slice(0, 10);
    const todayStart = new Date(`${todayKey}T00:00:00.000Z`);

    const [weekRows, todayRow, balances, pendingHr, payroll, employeeMeta] =
      await Promise.all([
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          employeeId,
          workDate: { gte: monday, lte: sunday },
        },
        select: { workedMinutes: true, lateMinutes: true, status: true, workDate: true },
      }),
      this.prisma.timeGateTimesheetDay.findUnique({
        where: {
          employeeId_workDate: { employeeId, workDate: todayStart },
        },
        select: {
          id: true,
          workedMinutes: true,
          lateMinutes: true,
          overtimeMinutes: true,
          status: true,
        },
      }),
      this.leaveBalances.getEmployeeBalances(employeeId, now.getUTCFullYear()).catch(() => null),
      this.getPendingHr(user),
      this.getMyPayrollSummary(user, Object.assign(new PaginationQueryDto(), { page: 1, limit: 1 })),
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          salaryCurrency: true,
          company: { select: { countryCode: true } },
        },
      }),
    ]);

    const weekWorkedMinutes = weekRows.reduce((sum, r) => sum + r.workedMinutes, 0);
    const weekReviewCount = weekRows.filter(
      (r) => r.status === TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
    ).length;

    let leaveRemaining: number | null = null;
    if (balances?.balances?.length) {
      leaveRemaining = balances.balances.reduce((sum, b) => {
        if (b.unlimited || b.remaining == null) return sum;
        return sum + b.remaining;
      }, 0);
    }

    return {
      week: {
        from: monday.toISOString().slice(0, 10),
        to: sunday.toISOString().slice(0, 10),
        workedMinutes: weekWorkedMinutes,
        reviewCount: weekReviewCount,
      },
      todayTimesheet: todayRow
        ? {
            id: todayRow.id,
            workedMinutes: todayRow.workedMinutes,
            lateMinutes: todayRow.lateMinutes,
            overtimeMinutes: todayRow.overtimeMinutes,
            status: todayRow.status,
          }
        : null,
      leaveRemaining,
      pendingHrCount: pendingHr.meta.total,
      latestPayroll: payroll.latest,
      currencyCode: this.resolveEmployeeCurrency(
        employeeMeta?.salaryCurrency,
        employeeMeta?.company?.countryCode,
      ),
    };
  }

  private toEmployeeTimesheetShape(row: {
    id: string;
    companyId: string;
    employeeId: string;
    date: string;
    workedMinutes: number;
    breakMinutes: number;
    lateMinutes: number;
    overtimeMinutes: number;
    status: string;
    ruleVersion: string;
    anomalyFlags: string[] | null;
    createdAt: string;
    updatedAt: string;
  }) {
    return {
      id: row.id,
      workDate: row.date.slice(0, 10),
      workedMinutes: row.workedMinutes,
      breakMinutes: row.breakMinutes,
      lateMinutes: row.lateMinutes,
      overtimeMinutes: row.overtimeMinutes,
      status: row.status,
      anomalyFlags: row.anomalyFlags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toEmployeePayrollLineShape(row: {
    id: string;
    payrollRunId: string;
    baseSalary: Prisma.Decimal;
    overtimeAmount: Prisma.Decimal;
    penaltyAmount: Prisma.Decimal;
    absenceAmount: Prisma.Decimal;
    bonusAmount: Prisma.Decimal;
    netSalary: Prisma.Decimal;
    fixedAllowancesTotal: Prisma.Decimal;
    fixedDeductionsTotal: Prisma.Decimal;
    variableAllowancesTotal: Prisma.Decimal;
    variableDeductionsTotal: Prisma.Decimal;
    lateMinutesPenalty: Prisma.Decimal;
    gross: Prisma.Decimal;
    paymentStatus: string;
    dueDate: Date | null;
    paidAt: Date | null;
    payrollRun: {
      id: string;
      year: number;
      month: number;
      status: TimeGatePayrollRunStatus;
      lockedAt: Date | null;
      paidAt: Date | null;
    };
  }) {
    return {
      id: row.id,
      payrollRunId: row.payrollRunId,
      year: row.payrollRun.year,
      month: row.payrollRun.month,
      runStatus: row.payrollRun.status,
      paymentStatus: row.paymentStatus,
      baseSalary: fromDecimal(row.baseSalary),
      allowances:
        fromDecimal(row.fixedAllowancesTotal) +
        fromDecimal(row.variableAllowancesTotal) +
        fromDecimal(row.bonusAmount) +
        fromDecimal(row.overtimeAmount),
      deductions:
        fromDecimal(row.fixedDeductionsTotal) +
        fromDecimal(row.variableDeductionsTotal) +
        fromDecimal(row.penaltyAmount) +
        fromDecimal(row.absenceAmount) +
        fromDecimal(row.lateMinutesPenalty),
      gross: fromDecimal(row.gross),
      net: fromDecimal(row.netSalary),
      dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
      paidAt: row.paidAt?.toISOString() ?? row.payrollRun.paidAt?.toISOString() ?? null,
      lockedAt: row.payrollRun.lockedAt?.toISOString() ?? null,
    };
  }
}
