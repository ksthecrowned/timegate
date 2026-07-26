import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EmployeeStatus,
  LeaveApplicationStatus,
  Prisma,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGatePunchClaimStatus,
  TimeGatePunchClaimType,
  TimeGateShiftSwapStatus,
  TimeGateTimesheetDayStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';
import { PunchWindowService } from '../attendance/punch-window.service';
import { ReviewAttendanceEventDto } from '../attendance/dto/review-attendance-event.dto';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import { toEmployeeSummary } from '../common/utils/employee-summary.util';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManagerInboxQueryDto, ManagerTeamTodayQueryDto } from './dto/manager-query.dto';

export type TeamMemberStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'ON_BREAK'
  | 'ON_LEAVE'
  | 'REVIEW_REQUIRED'
  | 'OFF'
  | 'EXPECTED';

type DayEvent = {
  type: TimeGateAttendanceEventType;
  status: TimeGateAttendanceEventStatus;
  occurredAt: Date;
};

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function employeeDisplayName(employee: {
  firstName: string | null;
  lastName: string | null;
  employeeName: string | null;
}): string {
  const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
  return name || employee.employeeName || 'Employé';
}

function parseAnomalyFlags(value: Prisma.JsonValue | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function isOnBreak(events: DayEvent[]): boolean {
  const accepted = events
    .filter((e) => e.status === TimeGateAttendanceEventStatus.ACCEPTED)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  let onBreak = false;
  for (const event of accepted) {
    if (event.type === TimeGateAttendanceEventType.BREAK_START) onBreak = true;
    if (event.type === TimeGateAttendanceEventType.BREAK_END) onBreak = false;
  }
  return onBreak;
}

function hasCheckIn(events: DayEvent[]): boolean {
  return events.some(
    (e) =>
      e.type === TimeGateAttendanceEventType.CHECK_IN &&
      (e.status === TimeGateAttendanceEventStatus.ACCEPTED ||
        e.status === TimeGateAttendanceEventStatus.REVIEW_REQUIRED),
  );
}

@Injectable()
export class ManagerService {
  constructor(
    private prisma: PrismaService,
    private holidayCalendar: HolidayCalendarService,
    private attendance: AttendanceService,
    private punchWindows: PunchWindowService,
  ) {}

  async teamToday(query: ManagerTeamTodayQueryDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const workDate = query.date ? toDateOnly(query.date) : toDateOnly(new Date().toISOString().slice(0, 10));
    const workDateIso = workDate.toISOString().slice(0, 10);
    const todayIso = new Date().toISOString().slice(0, 10);
    const isFuture = workDateIso > todayIso;
    const { start, end } = dayBounds(workDate);
    const branchId = query.resolvedBranchId();

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: EmployeeStatus.ACTIVE,
        ...(branchId ? { branchId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        branchId: true,
        holidayListId: true,
        branch: { select: { id: true, branchName: true } },
        department: { select: { id: true, departmentName: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const employeeIds = employees.map((e) => e.id);
    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(
      employees.map((e) => ({
        id: e.id,
        companyId,
        holidayListId: e.holidayListId,
      })),
      workDate,
      workDate,
    );

    const [leaves, events, timesheets] = await Promise.all([
      this.prisma.leaveApplication.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          status: LeaveApplicationStatus.APPROVED,
          fromDate: { lte: workDate },
          toDate: { gte: workDate },
        },
        select: { employeeId: true },
      }),
      this.prisma.timeGateAttendanceEvent.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          occurredAt: { gte: start, lte: end },
        },
        select: {
          employeeId: true,
          type: true,
          status: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'asc' },
      }),
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          workDate,
        },
        select: {
          employeeId: true,
          status: true,
          lateMinutes: true,
          workedMinutes: true,
          workDate: true,
          updatedAt: true,
          anomalyFlags: true,
        },
      }),
    ]);

    const onLeaveIds = new Set(leaves.map((l) => l.employeeId));
    const eventsByEmployee = new Map<string, DayEvent[]>();
    for (const event of events) {
      if (!event.employeeId) continue;
      const bucket = eventsByEmployee.get(event.employeeId) ?? [];
      bucket.push({
        type: event.type,
        status: event.status,
        occurredAt: event.occurredAt,
      });
      eventsByEmployee.set(event.employeeId, bucket);
    }

    const timesheetByEmployee = new Map(timesheets.map((t) => [t.employeeId, t]));

    const summary = {
      total: employees.length,
      present: 0,
      absent: 0,
      late: 0,
      onBreak: 0,
      onLeave: 0,
      reviewRequired: 0,
      off: 0,
      expected: 0,
    };

    const members = await Promise.all(
      employees.map(async (employee) => {
      const employeeEvents = eventsByEmployee.get(employee.id) ?? [];
      const timesheet = timesheetByEmployee.get(employee.id);
      const pendingReviewEvents = employeeEvents.filter(
        (e) => e.status === TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
      ).length;
      const timesheetReview =
        timesheet?.status === TimeGateTimesheetDayStatus.REVIEW_REQUIRED;
      const scheduled = await this.punchWindows.resolveForEmployee(employee.id, workDate);

      let status: TeamMemberStatus;
      if (onLeaveIds.has(employee.id)) {
        status = 'ON_LEAVE';
      } else if (isEmployeeHoliday(holidayIndex, employee.id, workDate) || !scheduled) {
        status = 'OFF';
      } else if (pendingReviewEvents > 0 || timesheetReview) {
        status = 'REVIEW_REQUIRED';
      } else if (isOnBreak(employeeEvents)) {
        status = 'ON_BREAK';
      } else if ((timesheet?.lateMinutes ?? 0) > 0) {
        status = 'LATE';
      } else if (hasCheckIn(employeeEvents)) {
        status = 'PRESENT';
      } else if (isFuture) {
        // Future workday: not yet worked — never mark as absent
        status = 'EXPECTED';
      } else {
        status = 'ABSENT';
      }

      summary[
        {
          ON_LEAVE: 'onLeave',
          OFF: 'off',
          REVIEW_REQUIRED: 'reviewRequired',
          ON_BREAK: 'onBreak',
          LATE: 'late',
          PRESENT: 'present',
          ABSENT: 'absent',
          EXPECTED: 'expected',
        }[status] as keyof typeof summary
      ] += 1;

      const lastEvent = employeeEvents.at(-1);

      return {
        employeeId: employee.id,
        employeeName: employeeDisplayName(employee),
        employee: toEmployeeSummary(employee),
        branch: employee.branch
          ? { id: employee.branch.id, name: employee.branch.branchName }
          : null,
        department: employee.department?.departmentName ?? null,
        status,
        lateMinutes: timesheet?.lateMinutes ?? 0,
        workedMinutes: timesheet?.workedMinutes ?? 0,
        pendingReviewEvents,
        lastEventAt: lastEvent?.occurredAt.toISOString() ?? null,
        lastEventType: lastEvent?.type ?? null,
      };
    }),
    );

    return {
      date: workDate.toISOString().slice(0, 10),
      branchId: branchId ?? null,
      summary,
      members,
    };
  }

  async inbox(query: ManagerInboxQueryDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const branchId = query.resolvedBranchId();
    const limit = Math.min(query.limit ?? 50, 100);

    const employeeFilter: Prisma.EmployeeWhereInput | undefined = branchId
      ? { branchId }
      : undefined;

    const [
      pendingEvents,
      pendingTimesheets,
      pendingLeaves,
      pendingSwaps,
      pendingClaims,
      eventCount,
      timesheetCount,
      leaveCount,
      swapCount,
      claimCount,
    ] = await Promise.all([
      this.prisma.timeGateAttendanceEvent.findMany({
        where: {
          companyId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
              faceEnrollmentPhoto: true,
            },
          },
        },
      }),
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          companyId,
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
        orderBy: { workDate: 'desc' },
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
              faceEnrollmentPhoto: true,
            },
          },
        },
      }),
      this.prisma.leaveApplication.findMany({
        where: {
          companyId,
          status: LeaveApplicationStatus.OPEN,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
              faceEnrollmentPhoto: true,
            },
          },
          leaveType: { select: { id: true, leaveTypeName: true } },
        },
      }),
      this.prisma.timeGateShiftSwapRequest.findMany({
        where: {
          companyId,
          status: TimeGateShiftSwapStatus.PENDING,
          ...(employeeFilter ? { requester: employeeFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
              faceEnrollmentPhoto: true,
            },
          },
          target: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
            },
          },
        },
      }),
      this.prisma.timeGatePunchClaim.findMany({
        where: {
          companyId,
          status: TimeGatePunchClaimStatus.OPEN,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeName: true,
              faceEnrollmentPhoto: true,
            },
          },
        },
      }),
      this.prisma.timeGateAttendanceEvent.count({
        where: {
          companyId,
          status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
      }),
      this.prisma.timeGateTimesheetDay.count({
        where: {
          companyId,
          status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
      }),
      this.prisma.leaveApplication.count({
        where: {
          companyId,
          status: LeaveApplicationStatus.OPEN,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
      }),
      this.prisma.timeGateShiftSwapRequest.count({
        where: {
          companyId,
          status: TimeGateShiftSwapStatus.PENDING,
          ...(employeeFilter ? { requester: employeeFilter } : {}),
        },
      }),
      this.prisma.timeGatePunchClaim.count({
        where: {
          companyId,
          status: TimeGatePunchClaimStatus.OPEN,
          ...(employeeFilter ? { employee: employeeFilter } : {}),
        },
      }),
    ]);

    const items = [
      ...pendingEvents.map((event) => ({
        id: event.id,
        type: 'ATTENDANCE_EVENT' as const,
        title: 'Pointage à valider',
        subtitle: `${this.eventTypeLabel(event.type)} — ${employeeDisplayName(event.employee!)}`,
        employee: toEmployeeSummary(event.employee),
        createdAt: event.occurredAt.toISOString(),
        href: `/attendance/events/${event.id}`,
        meta: {
          eventType: event.type,
          status: event.status,
        },
      })),
      ...pendingTimesheets.map((row) => {
        const flags = parseAnomalyFlags(row.anomalyFlags);
        const unclosed = flags.includes('UNCLOSED_CHECKIN');
        return {
          id: row.id,
          type: 'TIMESHEET_DAY' as const,
          title: unclosed ? 'Check-out oublié' : 'Journée à valider',
          subtitle: `${employeeDisplayName(row.employee!)} — ${row.workDate.toISOString().slice(0, 10)}`,
          employee: toEmployeeSummary(row.employee),
          createdAt: row.updatedAt.toISOString(),
          href: `/timesheets/${row.id}`,
          meta: {
            workDate: row.workDate.toISOString().slice(0, 10),
            workedMinutes: row.workedMinutes,
            anomalyFlags: flags,
            unclosed,
          },
        };
      }),
      ...pendingLeaves.map((leave) => ({
        id: leave.id,
        type: 'LEAVE' as const,
        title: 'Demande de congé',
        subtitle: `${employeeDisplayName(leave.employee!)} — ${leave.leaveType?.leaveTypeName ?? 'Congé'}`,
        employee: toEmployeeSummary(leave.employee),
        createdAt: leave.createdAt.toISOString(),
        href: `/leaves/${leave.id}/edit`,
        meta: {
          fromDate: leave.fromDate?.toISOString().slice(0, 10) ?? null,
          toDate: leave.toDate?.toISOString().slice(0, 10) ?? null,
        },
      })),
      ...pendingSwaps.map((swap) => ({
        id: swap.id,
        type: 'SHIFT_SWAP' as const,
        title: 'Échange de shift',
        subtitle: `${employeeDisplayName(swap.requester)} → ${swap.target ? employeeDisplayName(swap.target) : 'ouvert'}`,
        employee: toEmployeeSummary(swap.requester),
        createdAt: swap.createdAt.toISOString(),
        href: '/shift-swaps',
        meta: {
          swapDate: swap.swapDate.toISOString().slice(0, 10),
          reason: swap.reason,
        },
      })),
      ...pendingClaims.map((claim) => ({
        id: claim.id,
        type: 'PUNCH_CLAIM' as const,
        title: 'Réclamation pointage',
        subtitle: `${employeeDisplayName(claim.employee!)} — ${this.claimTypeLabel(claim.type)}`,
        employee: toEmployeeSummary(claim.employee),
        createdAt: claim.createdAt.toISOString(),
        href: `/punch-claims/${claim.id}`,
        meta: {
          workDate: claim.workDate.toISOString().slice(0, 10),
          claimType: claim.type,
          reason: claim.reason,
        },
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      counts: {
        attendanceEvents: eventCount,
        timesheetDays: timesheetCount,
        leaves: leaveCount,
        shiftSwaps: swapCount,
        punchClaims: claimCount,
        total: eventCount + timesheetCount + leaveCount + swapCount + claimCount,
      },
      items: items.slice(0, limit),
    };
  }

  async bulkReviewEvents(dto: { eventIds: string[] } & ReviewAttendanceEventDto, user: JwtUser) {
    const results: Awaited<ReturnType<AttendanceService['reviewEvent']>>[] = [];
    const errors: Array<{ id: string; message: string }> = [];

    for (const id of dto.eventIds) {
      try {
        results.push(
          await this.attendance.reviewEvent(
            id,
            { status: dto.status, reason: dto.reason },
            user,
          ),
        );
      } catch (err) {
        errors.push({
          id,
          message: err instanceof Error ? err.message : 'Review failed',
        });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new BadRequestException(errors[0]?.message ?? 'Bulk review failed');
    }

    return {
      reviewed: results.length,
      failed: errors.length,
      data: results,
      errors,
    };
  }

  private claimTypeLabel(type: TimeGatePunchClaimType): string {
    switch (type) {
      case TimeGatePunchClaimType.EARLY_DEPARTURE:
        return 'Départ anticipé';
      case TimeGatePunchClaimType.MISSED_CHECKOUT:
        return 'Oubli check-out';
      case TimeGatePunchClaimType.BREAK_NOT_TAKEN:
        return 'Pause non prise';
      default:
        return 'Autre';
    }
  }

  private eventTypeLabel(type: TimeGateAttendanceEventType): string {
    switch (type) {
      case TimeGateAttendanceEventType.CHECK_IN:
        return 'Arrivée';
      case TimeGateAttendanceEventType.CHECK_OUT:
        return 'Départ';
      case TimeGateAttendanceEventType.BREAK_START:
        return 'Début pause';
      case TimeGateAttendanceEventType.BREAK_END:
        return 'Reprise pause';
      default:
        return type;
    }
  }

  private requireCompanyId(user: JwtUser): string {
    if (user.role === TimeGateUserRole.SUPER_ADMIN || !user.companyId) {
      throw new BadRequestException('companyId is required for this operation');
    }
    return user.companyId;
  }
}
