import { BadRequestException, Injectable } from '@nestjs/common';
import { EmployeeStatus, LeaveApplicationStatus, TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { PrismaService } from '../prisma/prisma.service';
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
  return Math.max(0, end - start);
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
  ) {}

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

    const branchFilter = query.branchId?.trim()
      ? { branchId: query.branchId.trim() }
      : {};

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
        defaultShift: { select: { startTime: true, endTime: true } },
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
          shiftType: { select: { startTime: true, endTime: true } },
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
        const planned = shift ? shiftMinutes(shift.startTime, shift.endTime) : 480;

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
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }
}
