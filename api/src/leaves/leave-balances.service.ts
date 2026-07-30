import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { fromDecimal } from '../common/utils/money.util';

@Injectable()
export class LeaveBalancesService {
  constructor(private prisma: PrismaService) {}

  countLeaveDays(from: Date, to: Date): number {
    const start = this.toDateOnly(from);
    const end = this.toDateOnly(to);
    if (start > end) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  countLeaveDaysInYear(from: Date, to: Date, year: number): number {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31));
    const start = this.toDateOnly(from);
    const end = this.toDateOnly(to);
    const overlapStart = start > yearStart ? start : yearStart;
    const overlapEnd = end < yearEnd ? end : yearEnd;
    if (overlapStart > overlapEnd) return 0;
    return this.countLeaveDays(overlapStart, overlapEnd);
  }

  yearsInRange(from: Date, to: Date): number[] {
    const startYear = this.toDateOnly(from).getUTCFullYear();
    const endYear = this.toDateOnly(to).getUTCFullYear();
    const years: number[] = [];
    for (let year = startYear; year <= endYear; year++) years.push(year);
    return years;
  }

  async getUsedDays(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    excludeLeaveId?: string,
  ): Promise<number> {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const leaves = await this.prisma.leaveApplication.findMany({
      where: {
        employeeId,
        leaveTypeId,
        status: LeaveApplicationStatus.APPROVED,
        ...(excludeLeaveId ? { NOT: { id: excludeLeaveId } } : {}),
        fromDate: { lte: yearEnd },
        toDate: { gte: yearStart },
      },
      select: { fromDate: true, toDate: true },
    });

    return leaves.reduce((total, leave) => {
      if (!leave.fromDate || !leave.toDate) return total;
      return total + this.countLeaveDaysInYear(leave.fromDate, leave.toDate, year);
    }, 0);
  }

  async ensureAllocation(employeeId: string, leaveTypeId: string, year: number) {
    const existing = await this.prisma.leaveAllocation.findUnique({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
    });
    if (existing) return existing;

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const allocatedDays = leaveType.maxDaysPerYear ?? 0;
    return this.prisma.leaveAllocation.create({
      data: {
        id: generateDocId('LALLOC'),
        employeeId,
        leaveTypeId,
        year,
        allocatedDays,
      },
    });
  }

  async getBalance(employeeId: string, leaveTypeId: string, year: number, excludeLeaveId?: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    if (leaveType.isLwp || leaveType.maxDaysPerYear == null) {
      return {
        leaveTypeId,
        leaveTypeName: leaveType.leaveTypeName,
        year,
        allocated: null,
        used: 0,
        remaining: null,
        unlimited: true,
      };
    }

    const allocation = await this.ensureAllocation(employeeId, leaveTypeId, year);
    const allocated = fromDecimal(allocation.allocatedDays);
    const used = await this.getUsedDays(employeeId, leaveTypeId, year, excludeLeaveId);

    return {
      leaveTypeId,
      leaveTypeName: leaveType.leaveTypeName,
      year,
      allocated,
      used,
      remaining: allocated - used,
      unlimited: false,
    };
  }

  async getEmployeeBalances(employeeId: string, year?: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const targetYear = year ?? new Date().getUTCFullYear();
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { companyId: employee.companyId },
      orderBy: { leaveTypeName: 'asc' },
    });

    const balances = await Promise.all(
      leaveTypes.map((type) => this.getBalance(employeeId, type.id, targetYear)),
    );

    return { employeeId, year: targetYear, balances };
  }

  async assertSufficientBalance(params: {
    employeeId: string;
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    excludeLeaveId?: string;
  }) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: params.leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (leaveType.isLwp || leaveType.maxDaysPerYear == null) return;

    for (const year of this.yearsInRange(params.fromDate, params.toDate)) {
      const requestedDays = this.countLeaveDaysInYear(params.fromDate, params.toDate, year);
      if (requestedDays <= 0) continue;

      const balance = await this.getBalance(
        params.employeeId,
        params.leaveTypeId,
        year,
        params.excludeLeaveId,
      );
      if (balance.remaining !== null && requestedDays > balance.remaining) {
        throw new BadRequestException(
          `Solde congés insuffisant pour ${leaveType.leaveTypeName} (${year}) : ${balance.remaining} jour(s) restant(s), ${requestedDays} demandé(s)`,
        );
      }
    }
  }

  async upsertAllocation(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    allocatedDays: number,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (leaveType.companyId && leaveType.companyId !== employee.companyId) {
      throw new NotFoundException('Leave type not found');
    }

    return this.prisma.leaveAllocation.upsert({
      where: {
        employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year },
      },
      create: {
        id: generateDocId('LALLOC'),
        employeeId,
        leaveTypeId,
        year,
        allocatedDays,
      },
      update: { allocatedDays },
    });
  }

  private toDateOnly(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
}
