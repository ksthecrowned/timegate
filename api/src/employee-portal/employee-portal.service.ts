import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class EmployeePortalService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private leaves: LeavesService,
    private leaveBalances: LeaveBalancesService,
    private leaveTypes: LeaveTypesService,
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
        companyId: true,
        branch: { select: { id: true, branchName: true } },
        defaultShift: { select: { id: true, shiftName: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return {
      id: employee.id,
      firstName: employee.firstName ?? employee.employeeName,
      lastName: employee.lastName ?? '',
      email: employee.personalEmail,
      phone: employee.cellNumber,
      status: employee.status,
      branchId: employee.branchId,
      branchName: employee.branch?.branchName ?? null,
      defaultShiftName: employee.defaultShift?.shiftName ?? null,
      companyId: employee.companyId,
    };
  }

  findMyCheckins(user: JwtUser, query: PaginationQueryDto) {
    const scoped = Object.assign(new PaginationQueryDto(), query, {
      employeeId: user.employeeId!,
    });
    return this.attendance.findCheckins(scoped, user);
  }

  findMyLeaves(user: JwtUser, query: PaginationQueryDto) {
    const scoped = Object.assign(new PaginationQueryDto(), query, {
      employeeId: user.employeeId!,
    });
    return this.leaves.findAll(scoped, user.companyId ?? undefined);
  }

  createLeaveRequest(user: JwtUser, dto: CreateSelfLeaveDto) {
    return this.leaves.create({
      employeeId: user.employeeId!,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      leaveTypeId: dto.leaveTypeId,
      status: LegacyLeaveStatus.PENDING,
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
}
