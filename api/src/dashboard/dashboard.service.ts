import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EmployeeStatus,
  KioskStatus,
  LeaveApplicationStatus,
  TimeGateAttendanceEventStatus,
  TimeGatePayrollRunStatus,
  TimeGateUserRole,
  WeekDay,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { ManagerInboxQueryDto, ManagerTeamTodayQueryDto } from '../manager/dto/manager-query.dto';
import { ManagerService } from '../manager/manager.service';
import { PrismaService } from '../prisma/prisma.service';
import { fromDecimal } from '../common/utils/money.util';
import {
  dateKeyAddDays,
  dateKeyInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  resolveOrgTimeZone,
  shiftDurationMinutes,
  toWeekDay,
} from '../common/utils/punch-time.util';
import { PlanningVsActualQueryDto } from './dto/planning-vs-actual-query.dto';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function enumerateDates(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function shiftMinutes(startTime: Date | null | undefined, endTime: Date | null | undefined): number {
  if (!startTime || !endTime) return 480;
  const start = startTime.getUTCHours() * 60 + startTime.getUTCMinutes();
  const end = endTime.getUTCHours() * 60 + endTime.getUTCMinutes();
  return shiftDurationMinutes(start, end);
}

function isAssignmentActive(
  assignment: { startDate: Date | null; endDate: Date | null },
  day: Date,
): boolean {
  if (assignment.startDate && day < assignment.startDate) return false;
  if (assignment.endDate && day > assignment.endDate) return false;
  return true;
}

function weekLabel(day: Date): { week: string; label: string } {
  const d = new Date(day);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, label: `S${week}` };
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private holidayCalendar: HolidayCalendarService,
    private manager: ManagerService,
  ) {}

  async home(user: JwtUser) {
    const companyId = this.resolveCompanyFilter(user);
    if (!companyId) {
      throw new BadRequestException('companyId is required for this operation');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timeZone: true },
    });
    const timeZone = resolveOrgTimeZone(company?.timeZone);
    const todayIso = dateKeyInTimeZone(new Date(), timeZone);
    const fromIso = dateKeyAddDays(todayIso, -29);
    const from = toDateOnly(fromIso);
    const to = toDateOnly(todayIso);
    const todayBounds = dayBoundsForDateKeyInTimeZone(todayIso, timeZone);

    const teamQuery = Object.assign(new ManagerTeamTodayQueryDto(), { date: todayIso });
    const inboxQuery = Object.assign(new ManagerInboxQueryDto(), { limit: 1 });
    const planningQuery = Object.assign(new PlanningVsActualQueryDto(), {
      from: fromIso,
      to: todayIso,
    });

    const [
      team,
      inbox,
      kiosksOffline,
      kiosksTotal,
      employees,
      branches,
      kiosks,
      absences30,
      late30,
      pendingLeaves,
      timesheets30,
      reviewEventsToday,
      planning,
    ] = await Promise.all([
      this.manager.teamToday(teamQuery, user),
      this.manager.inbox(inboxQuery, user),
      this.prisma.timeGateKiosk.count({
        where: { companyId, isActive: true, status: KioskStatus.OFFLINE },
      }),
      this.prisma.timeGateKiosk.count({ where: { companyId, isActive: true } }),
      this.prisma.employee.count({
        where: { companyId, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.branch.count({ where: { companyId } }),
      this.prisma.timeGateKiosk.count({ where: { companyId } }),
      this.prisma.timeGateAbsenceRecord.count({
        where: { companyId, recordDate: { gte: from, lte: to } },
      }),
      this.prisma.timeGateLateRecord.count({
        where: { companyId, recordDate: { gte: from, lte: to } },
      }),
      this.prisma.leaveApplication.count({
        where: {
          companyId,
          status: LeaveApplicationStatus.OPEN,
        },
      }),
      this.prisma.timeGateTimesheetDay.count({
        where: { companyId, workDate: { gte: from, lte: to } },
      }),
      this.prisma.timeGateAttendanceEvent.count({
        where: {
          companyId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
          occurredAt: {
            gte: todayBounds.start,
            lte: todayBounds.end,
          },
        },
      }),
      this.planningVsActual(planningQuery, user),
    ]);

    const role = user.role === TimeGateUserRole.MANAGER ? 'MANAGER' : 'ADMIN';
    const summary = team.summary;
    const payrollMassData =
      user.role === TimeGateUserRole.ADMIN
        ? await this.getPayrollMassData(companyId)
        : null;

    return {
      role,
      date: todayIso,
      today: {
        total: summary.total,
        present: summary.present,
        absent: summary.absent,
        onLeave: summary.onLeave,
        late: summary.late,
        onBreak: summary.onBreak,
        reviewRequired: summary.reviewRequired,
        off: summary.off,
        reviewEventsToday,
        inboxTotal: inbox.counts.total,
        inbox: inbox.counts,
        kiosksOffline,
        kiosksTotal,
      },
      kpis: {
        employees,
        branches,
        kiosks,
        absences30,
        late30,
        pendingLeaves,
        timesheets30,
        coveragePercent: planning.coveragePercent,
        plannedMinutes: planning.plannedMinutes,
        workedMinutes: planning.workedMinutes,
      },
      planningVsActual: planning,
      ...(payrollMassData ?? {}),
    };
  }

  private async getPayrollMassData(companyId: string) {
    const now = new Date();
    const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const sixMonthsAgo = new Date(currentMonth);
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 5);
    const eligibleStatuses = [
      TimeGatePayrollRunStatus.LOCKED,
      TimeGatePayrollRunStatus.PARTIALLY_PAID,
      TimeGatePayrollRunStatus.PAID,
    ];

    const [latestRun, runs] = await Promise.all([
      this.prisma.timeGatePayrollRun.findFirst({
        where: { companyId, status: { in: eligibleStatuses } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: {
          id: true,
          year: true,
          month: true,
          status: true,
          totalGross: true,
          totalNet: true,
        },
      }),
      this.prisma.timeGatePayrollRun.findMany({
        where: {
          companyId,
          status: { in: eligibleStatuses },
          OR: [
            { year: { gt: sixMonthsAgo.getUTCFullYear() } },
            {
              year: sixMonthsAgo.getUTCFullYear(),
              month: { gte: sixMonthsAgo.getUTCMonth() + 1 },
            },
          ],
        },
        select: { year: true, month: true, totalGross: true, status: true },
      }),
    ]);

    const runsByPeriod = new Map(runs.map((run) => [`${run.year}-${run.month}`, run]));
    const payrollMassSeries = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(sixMonthsAgo);
      date.setUTCMonth(date.getUTCMonth() + index);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const run = runsByPeriod.get(`${year}-${month}`);

      return {
        year,
        month,
        totalGross: fromDecimal(run?.totalGross),
        status: run?.status ?? TimeGatePayrollRunStatus.DRAFT,
      };
    });

    return {
      payrollMass: latestRun
        ? {
            year: latestRun.year,
            month: latestRun.month,
            status: latestRun.status,
            runId: latestRun.id,
            totalGross: fromDecimal(latestRun.totalGross),
            totalNet: fromDecimal(latestRun.totalNet),
          }
        : null,
      payrollMassSeries,
    };
  }

  async planningVsActual(query: PlanningVsActualQueryDto, user: JwtUser) {
    const from = toDateOnly(query.from);
    const to = toDateOnly(query.to);
    if (from > to) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const companyId = this.resolveCompanyFilter(user);
    if (!companyId) {
      throw new BadRequestException('companyId is required for this operation');
    }

    const branchId = query.branchId?.trim() || undefined;
    if (branchId) {
      await this.ensureBranchForCompany(branchId, companyId);
    }
    const branchFilter = branchId ? { branchId } : {};

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: EmployeeStatus.ACTIVE,
        ...branchFilter,
      },
      select: {
        id: true,
        companyId: true,
        holidayListId: true,
        defaultShiftId: true,
        defaultShift: {
          select: {
            startTime: true,
            endTime: true,
            weekDays: { select: { day: true, startTime: true, endTime: true } },
          },
        },
      },
    });

    const employeeIds = employees.map((e) => e.id);
    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(employees, from, to);

    const [assignments, leaves, timesheets] = await Promise.all([
      this.prisma.shiftAssignment.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
        },
        include: {
          shiftType: {
            select: {
              startTime: true,
              endTime: true,
              weekDays: { select: { day: true, startTime: true, endTime: true } },
            },
          },
        },
      }),
      this.prisma.leaveApplication.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          status: { in: [LeaveApplicationStatus.OPEN, LeaveApplicationStatus.APPROVED] },
          fromDate: { lte: to },
          toDate: { gte: from },
        },
        select: { employeeId: true, fromDate: true, toDate: true },
      }),
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          workDate: { gte: from, lte: to },
        },
        select: { employeeId: true, workDate: true, workedMinutes: true },
      }),
    ]);

    const assignmentsByEmployee = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const bucket = assignmentsByEmployee.get(assignment.employeeId) ?? [];
      bucket.push(assignment);
      assignmentsByEmployee.set(assignment.employeeId, bucket);
    }

    const workedByDay = new Map<string, number>();
    for (const ts of timesheets) {
      const key = `${ts.employeeId}:${ts.workDate.toISOString().slice(0, 10)}`;
      workedByDay.set(key, (workedByDay.get(key) ?? 0) + ts.workedMinutes);
    }

    let plannedMinutes = 0;
    let workedMinutes = 0;
    const weekPlanned = new Map<string, number>();
    const weekWorked = new Map<string, number>();

    for (const day of enumerateDates(from, to)) {
      const iso = day.toISOString().slice(0, 10);
      const { week } = weekLabel(day);

      for (const employee of employees) {
        const onLeave = leaves.some(
          (leave) =>
            leave.employeeId === employee.id &&
            leave.fromDate &&
            leave.toDate &&
            leave.fromDate <= day &&
            leave.toDate >= day,
        );
        if (onLeave || isEmployeeHoliday(holidayIndex, employee.id, day)) {
          continue;
        }

        const employeeAssignments = assignmentsByEmployee.get(employee.id) ?? [];
        const activeAssignment = employeeAssignments.find((a) => isAssignmentActive(a, day));
        const shift = activeAssignment?.shiftType ?? employee.defaultShift;
        if (!shift) continue;

        const weekDays = shift.weekDays as Array<{
          day: WeekDay;
          startTime: string;
          endTime: string;
        }>;
        const weekDayRow =
          weekDays.length > 0 ? weekDays.find((row) => row.day === toWeekDay(day)) : null;
        if (weekDays.length > 0 && !weekDayRow) {
          continue;
        }

        const planned = weekDayRow
          ? (() => {
              const [sh, sm] = weekDayRow.startTime.split(':').map(Number);
              const [eh, em] = weekDayRow.endTime.split(':').map(Number);
              return shiftDurationMinutes(sh * 60 + (sm || 0), eh * 60 + (em || 0));
            })()
          : shiftMinutes(shift.startTime, shift.endTime);

        plannedMinutes += planned;
        weekPlanned.set(week, (weekPlanned.get(week) ?? 0) + planned);

        const worked = workedByDay.get(`${employee.id}:${iso}`) ?? 0;
        workedMinutes += worked;
        weekWorked.set(week, (weekWorked.get(week) ?? 0) + worked);
      }
    }

    const weekKeys = [...new Set([...weekPlanned.keys(), ...weekWorked.keys()])].sort();
    const byWeek = weekKeys.map((week) => ({
      week,
      label: `S${Number(week.split('-W')[1] ?? 0)}`,
      plannedMinutes: weekPlanned.get(week) ?? 0,
      workedMinutes: weekWorked.get(week) ?? 0,
    }));

    const coveragePercent =
      plannedMinutes > 0 ? Math.round((workedMinutes / plannedMinutes) * 1000) / 10 : null;

    return {
      from: query.from,
      to: query.to,
      plannedMinutes,
      workedMinutes,
      varianceMinutes: workedMinutes - plannedMinutes,
      coveragePercent,
      byWeek,
    };
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private async ensureBranchForCompany(branchId: string, companyId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, companyId: true },
    });
    if (!branch || branch.companyId !== companyId) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }
}
