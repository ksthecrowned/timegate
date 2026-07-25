import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveBalanceQueryDto } from '../leaves/dto/leave-balance-query.dto';
import { AttendanceService } from '../attendance/attendance.service';
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

@Injectable()
export class EmployeePortalService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private leaves: LeavesService,
    private leaveBalances: LeaveBalancesService,
    private leaveTypes: LeaveTypesService,
    private shiftSwaps: ShiftSwapsService,
    private punchClaims: PunchClaimsService,
    private storage: CloudflareR2Service,
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
        company: { select: { id: true, name: true, sku: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

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
      language: employee.user?.language ?? null,
      deviceTrust: user.deviceTrust ?? null,
    };
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

  createLeaveRequest(user: JwtUser, dto: CreateSelfLeaveDto, file?: Express.Multer.File) {
    return this.createLeaveRequestWithDocument(user, dto, file);
  }

  async createLeaveRequestWithDocument(
    user: JwtUser,
    dto: CreateSelfLeaveDto,
    file?: Express.Multer.File,
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

    return this.leaves.create({
      employeeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      leaveTypeId: dto.leaveTypeId,
      status: LegacyLeaveStatus.PENDING,
      supportDocumentUrl,
    });
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
}
