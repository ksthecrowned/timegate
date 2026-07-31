import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  Prisma,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateTimesheetDayStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { FindTimesheetsQueryDto } from './dto/find-timesheets-query.dto';
import { OverrideTimesheetDto } from './dto/override-timesheet.dto';
import { RecalculateTimesheetsDto } from './dto/recalculate-timesheets.dto';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';
import { computeBreakDeduction } from '../common/utils/break-calculation.util';
import { PunchWindowService } from '../attendance/punch-window.service';
import { ResolvedPunchWindows } from '../attendance/punch-window.types';
import {
  dateKeyAddDays,
  dateKeyInTimeZone,
  dateToMinutesInTimeZone,
  dayBoundsForDateKeyInTimeZone,
  minutesSinceOrigin,
  punchEventBoundsForWorkDate,
  resolveOrgTimeZone,
  resolvePunchWorkDateKey,
  shiftDurationMinutes,
} from '../common/utils/punch-time.util';
import {
  roundMinutesToStep,
  TimesheetPolicy,
  DEFAULT_TIMESHEET_POLICY,
} from '../common/utils/timesheet-policy.util';
import { NotificationsService } from '../notifications/notifications.service';

const RULE_VERSION = 'v4';

type DayEvent = {
  type: TimeGateAttendanceEventType;
  status: TimeGateAttendanceEventStatus;
  occurredAt: Date;
};

type ShiftWindow = {
  startTime: Date;
  endTime: Date;
  lateGraceMinutes: number;
  scheduledMinutes: number;
};

@Injectable()
export class TimesheetsService {
  constructor(
    private prisma: PrismaService,
    private holidayCalendar: HolidayCalendarService,
    private punchWindows: PunchWindowService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query: FindTimesheetsQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);
    const branchId = query.resolvedBranchId();

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const where: Prisma.TimeGateTimesheetDayWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(branchId ? { employee: { branchId } } : {}),
      ...(query.from || query.to
        ? {
            workDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateTimesheetDay.findMany({
        where,
        orderBy: [{ workDate: 'desc' }, { employeeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: employeeSummarySelect,
          },
        },
      }),
      this.prisma.timeGateTimesheetDay.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateTimesheetDay.findUnique({
      where: { id },
      include: {
        employee: {
          select: employeeSummarySelect,
        },
      },
    });
    if (!row) throw new NotFoundException('Timesheet day not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async recalculate(dto: RecalculateTimesheetsDto, user: JwtUser) {
    const from = this.toDateOnly(dto.from);
    const to = this.toDateOnly(dto.to);
    if (from > to) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const companyId =
      this.resolveCompanyFilter(user) ?? dto.companyId?.trim() ?? undefined;
    if (!companyId) {
      throw new BadRequestException('companyId is required for this operation');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timeZone: true },
    });
    const timeZone = resolveOrgTimeZone(company?.timeZone);

    const branchId = dto.branchId;
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        ...(branchId ? { branchId } : {}),
        ...(dto.employeeId ? { id: dto.employeeId } : {}),
        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        companyId: true,
        defaultShiftId: true,
        holidayListId: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        branchId: true,
      },
    });

    if (!employees.length) {
      return { processed: 0, created: 0, updated: 0, employees: 0, days: 0 };
    }

    const days = this.enumerateDates(from, to);
    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(employees, from, to);
    const todayStart = this.startOfUtcDay(new Date());
    const fromKey = from.toISOString().slice(0, 10);
    const toKey = to.toISOString().slice(0, 10);
    // Org-local day start (not UTC midnight) so early local punches are not dropped.
    const eventFetchStart = dayBoundsForDateKeyInTimeZone(fromKey, timeZone).start;
    // Include next local day so overnight morning check-outs still land in range.
    const eventFetchEnd = punchEventBoundsForWorkDate(toKey, timeZone, true).end;
    const employeeIds = employees.map((e) => e.id);

    const shiftIds = [
      ...new Set(employees.map((e) => e.defaultShiftId).filter((id): id is string => !!id)),
    ];
    const shifts =
      shiftIds.length > 0
        ? await this.prisma.shiftType.findMany({
            where: { id: { in: shiftIds } },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              lateGraceMinutes: true,
            },
          })
        : [];
    const shiftById = new Map(shifts.map((s) => [s.id, s]));

    const settings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
    });
    const defaultGrace = settings?.lateThreshold ?? DEFAULT_TIMESHEET_POLICY.lateGraceMinutes;
    const policy: TimesheetPolicy = {
      lateGraceMinutes: defaultGrace,
      roundingMinutes: settings?.timesheetRoundingMinutes ?? 0,
      minRestMinutes: settings?.minMinutesBetweenShifts ?? DEFAULT_TIMESHEET_POLICY.minRestMinutes,
      overtimeAlertThresholdMinutes:
        settings?.overtimeAlertThresholdMinutes ??
        DEFAULT_TIMESHEET_POLICY.overtimeAlertThresholdMinutes,
    };

    const events = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        occurredAt: { gte: eventFetchStart, lte: eventFetchEnd },
      },
      select: {
        employeeId: true,
        type: true,
        status: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'asc' },
    });

    const windowsCache = new Map<string, ResolvedPunchWindows | null>();
    const resolveWindows = async (employeeId: string, dateKey: string) => {
      const cacheKey = `${employeeId}:${dateKey}`;
      if (windowsCache.has(cacheKey)) return windowsCache.get(cacheKey) ?? null;
      const windows = await this.punchWindows.resolveForEmployee(
        employeeId,
        new Date(`${dateKey}T00:00:00.000Z`),
      );
      windowsCache.set(cacheKey, windows);
      return windows;
    };

    const eventsByEmployeeDay = new Map<string, DayEvent[]>();
    for (const event of events) {
      if (!event.employeeId) continue;
      const todayKey = dateKeyInTimeZone(event.occurredAt, timeZone);
      const yesterdayKey = dateKeyAddDays(todayKey, -1);
      const atMin = dateToMinutesInTimeZone(event.occurredAt, timeZone);
      const yesterdayWindows = await resolveWindows(event.employeeId, yesterdayKey);
      const workDateKey = resolvePunchWorkDateKey(todayKey, atMin, yesterdayWindows);
      const dayIso = new Date(`${workDateKey}T00:00:00.000Z`).toISOString();
      const dayKey = `${event.employeeId}:${dayIso}`;
      const bucket = eventsByEmployeeDay.get(dayKey) ?? [];
      bucket.push({
        type: event.type,
        status: event.status,
        occurredAt: event.occurredAt,
      });
      eventsByEmployeeDay.set(dayKey, bucket);
    }

    let created = 0;
    let updated = 0;

    for (const employee of employees) {
      const shift = employee.defaultShiftId
        ? shiftById.get(employee.defaultShiftId)
        : undefined;
      const shiftWindow =
        shift?.startTime && shift?.endTime
          ? this.buildShiftWindow(shift.startTime, shift.endTime, shift.lateGraceMinutes)
          : null;

      for (const day of days) {
        const dayKey = `${employee.id}:${day.toISOString()}`;
        const dayEvents = eventsByEmployeeDay.get(dayKey) ?? [];
        const workDateKey = day.toISOString().slice(0, 10);
        const prevDayKey = `${employee.id}:${new Date(`${dateKeyAddDays(workDateKey, -1)}T00:00:00.000Z`).toISOString()}`;
        const previousDayEvents = eventsByEmployeeDay.get(prevDayKey) ?? [];
        const punchWindows = await resolveWindows(employee.id, workDateKey);
        const resolvedShiftWindow = punchWindows
          ? this.shiftWindowFromPunchWindows(
              punchWindows,
              shift?.lateGraceMinutes ?? policy.lateGraceMinutes,
            )
          : shiftWindow;
        const shiftGrace = resolvedShiftWindow?.lateGraceMinutes ?? policy.lateGraceMinutes;
        const metrics = this.computeDayMetrics(
          day,
          dayEvents,
          resolvedShiftWindow,
          shiftGrace,
          todayStart,
          isEmployeeHoliday(holidayIndex, employee.id, day),
          punchWindows,
          policy,
          previousDayEvents,
          timeZone,
        );

        const existing = await this.prisma.timeGateTimesheetDay.findUnique({
          where: {
            employeeId_workDate: {
              employeeId: employee.id,
              workDate: day,
            },
          },
        });

        const metricsData = {
          workedMinutes: metrics.workedMinutes,
          breakMinutes: metrics.breakMinutes,
          lateMinutes: metrics.lateMinutes,
          overtimeMinutes: metrics.overtimeMinutes,
          status: metrics.status,
          ruleVersion: RULE_VERSION,
          anomalyFlags: metrics.anomalyFlags
            ? (metrics.anomalyFlags as Prisma.InputJsonValue)
            : Prisma.DbNull,
        };

        if (existing) {
          await this.prisma.timeGateTimesheetDay.update({
            where: { id: existing.id },
            data: metricsData,
          });
          updated += 1;
        } else {
          await this.prisma.timeGateTimesheetDay.create({
            data: {
              id: generateDocId('TSD'),
              companyId: employee.companyId!,
              employeeId: employee.id,
              workDate: day,
              ...metricsData,
            },
          });
          created += 1;
        }

        const isPastDay = day < todayStart;
        if (
          isPastDay &&
          metrics.overtimeMinutes >= policy.overtimeAlertThresholdMinutes &&
          policy.overtimeAlertThresholdMinutes > 0
        ) {
          const employeeName =
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
            employee.employeeName;
          void this.notifications
            .notifyOvertimeThreshold({
              companyId: employee.companyId!,
              employeeId: employee.id,
              employeeName,
              branchId: employee.branchId ?? undefined,
              workDate: day,
              overtimeMinutes: metrics.overtimeMinutes,
              thresholdMinutes: policy.overtimeAlertThresholdMinutes,
            })
            .catch(() => undefined);
        }
        if (isPastDay && metrics.breakOverrunMinutes > 0) {
          const employeeName =
            `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
            employee.employeeName;
          void this.notifications
            .notifyBreakOverrun({
              companyId: employee.companyId!,
              employeeId: employee.id,
              employeeName,
              branchId: employee.branchId ?? undefined,
              workDate: day,
              overrunMinutes: metrics.breakOverrunMinutes,
            })
            .catch(() => undefined);
        }
      }
    }

    return {
      processed: days.length * employees.length,
      created,
      updated,
      employees: employees.length,
      days: days.length,
      ruleVersion: RULE_VERSION,
    };
  }

  async override(id: string, dto: OverrideTimesheetDto, user: JwtUser) {
    const row = await this.prisma.timeGateTimesheetDay.findUnique({
      where: { id },
      include: {
        employee: {
          select: employeeSummarySelect,
        },
      },
    });
    if (!row) throw new NotFoundException('Timesheet day not found');

    this.assertCompanyAccess(user, row.companyId);

    const previous = {
      workedMinutes: row.workedMinutes,
      lateMinutes: row.lateMinutes,
      breakMinutes: row.breakMinutes,
      overtimeMinutes: row.overtimeMinutes,
      status: row.status,
    };

    const [updated] = await this.prisma.$transaction([
      this.prisma.timeGateTimesheetDay.update({
        where: { id },
        data: {
          workedMinutes: dto.workedMinutes,
          lateMinutes: dto.lateMinutes,
          ...(dto.breakMinutes !== undefined ? { breakMinutes: dto.breakMinutes } : {}),
          ...(dto.overtimeMinutes !== undefined ? { overtimeMinutes: dto.overtimeMinutes } : {}),
          status: TimeGateTimesheetDayStatus.CLOSED,
        },
        include: {
          employee: {
            select: employeeSummarySelect,
          },
        },
      }),
      this.prisma.timeGateTimesheetOverride.create({
        data: {
          id: generateDocId('TSO'),
          timesheetDayId: id,
          companyId: row.companyId,
          managerUserId: user.sub,
          reason: dto.reason.trim(),
          meta: {
            previous,
            next: {
              workedMinutes: dto.workedMinutes,
              lateMinutes: dto.lateMinutes,
              ...(dto.breakMinutes !== undefined ? { breakMinutes: dto.breakMinutes } : {}),
              ...(dto.overtimeMinutes !== undefined ? { overtimeMinutes: dto.overtimeMinutes } : {}),
            },
          },
        },
      }),
      this.prisma.timeGateAuditLog.create({
        data: {
          id: generateDocId('AUD'),
          userId: user.sub,
          companyId: row.companyId,
          action: 'TIMESHEET_DAY_OVERRIDE',
          entity: 'TimeGateTimesheetDay',
          entityId: id,
        },
      }),
    ]);

    return this.toApiShape(updated);
  }

  async listOverrides(timesheetDayId: string, user: JwtUser) {
    const row = await this.prisma.timeGateTimesheetDay.findUnique({
      where: { id: timesheetDayId },
    });
    if (!row) throw new NotFoundException('Timesheet day not found');
    this.assertCompanyAccess(user, row.companyId);

    const items = await this.prisma.timeGateTimesheetOverride.findMany({
      where: { timesheetDayId },
      orderBy: { createdAt: 'desc' },
      include: {
        managerUser: { select: { id: true, email: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      timesheetDayId: item.timesheetDayId,
      companyId: item.companyId,
      managerUserId: item.managerUserId,
      manager: item.managerUser
        ? { id: item.managerUser.id, email: item.managerUser.email }
        : null,
      reason: item.reason,
      meta: item.meta,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  private computeDayMetrics(
    day: Date,
    events: DayEvent[],
    shift: ShiftWindow | null,
    defaultGrace: number,
    todayStart: Date,
    isHoliday: boolean,
    punchWindows: ResolvedPunchWindows | null,
    policy: TimesheetPolicy,
    previousDayEvents: DayEvent[] = [],
    timeZone: string = resolveOrgTimeZone(null),
  ) {
    const hasReview = events.some(
      (e) => e.status === TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
    );
    const accepted = events.filter(
      (e) => e.status === TimeGateAttendanceEventStatus.ACCEPTED,
    );

    const grossWorkedMinutes = this.sumPairedMinutes(
      accepted,
      TimeGateAttendanceEventType.CHECK_IN,
      TimeGateAttendanceEventType.CHECK_OUT,
    );
    const breakResult = computeBreakDeduction(events, punchWindows);
    const breakMinutes = breakResult.breakMinutes;
    let workedMinutes = Math.max(0, grossWorkedMinutes - breakMinutes);
    workedMinutes = roundMinutesToStep(workedMinutes, policy.roundingMinutes);

    const anomalies: string[] = [];
    if (breakResult.breakSurplusMinutes > 0) {
      anomalies.push('BREAK_OVERRUN');
    }
    if (policy.minRestMinutes > 0) {
      const prevAccepted = previousDayEvents.filter(
        (e) => e.status === TimeGateAttendanceEventStatus.ACCEPTED,
      );
      const prevCheckOut = [...prevAccepted]
        .reverse()
        .find((e) => e.type === TimeGateAttendanceEventType.CHECK_OUT);
      const todayCheckIn = accepted.find((e) => e.type === TimeGateAttendanceEventType.CHECK_IN);
      if (prevCheckOut && todayCheckIn) {
        const restMinutes = this.diffMinutes(prevCheckOut.occurredAt, todayCheckIn.occurredAt);
        if (restMinutes < policy.minRestMinutes) {
          anomalies.push('INSUFFICIENT_REST');
        }
      }
    }
    if (this.hasUnclosedPair(accepted, TimeGateAttendanceEventType.CHECK_IN, TimeGateAttendanceEventType.CHECK_OUT)) {
      anomalies.push('UNCLOSED_CHECKIN');
    }
    if (this.hasUnclosedPair(accepted, TimeGateAttendanceEventType.BREAK_START, TimeGateAttendanceEventType.BREAK_END)) {
      anomalies.push('UNCLOSED_BREAK');
    }

    let lateMinutes = 0;
    let overtimeMinutes = 0;
    const firstCheckIn = accepted.find((e) => e.type === TimeGateAttendanceEventType.CHECK_IN);
    if (firstCheckIn) {
      const grace = shift?.lateGraceMinutes ?? defaultGrace;
      if (punchWindows) {
        const checkInMin = dateToMinutesInTimeZone(firstCheckIn.occurredAt, timeZone);
        const sinceStart = minutesSinceOrigin(checkInMin, punchWindows.shiftStartMin);
        const lateRaw = sinceStart - grace;
        if (lateRaw > 0 && sinceStart < shiftDurationMinutes(punchWindows.shiftStartMin, punchWindows.shiftEndMin)) {
          lateMinutes = roundMinutesToStep(lateRaw, policy.roundingMinutes);
        }
      } else if (shift) {
        const scheduledStart = this.combineDayAndTime(day, shift.startTime);
        const graceMs = grace * 60_000;
        const lateMs = firstCheckIn.occurredAt.getTime() - scheduledStart.getTime() - graceMs;
        if (lateMs > 0) {
          lateMinutes = roundMinutesToStep(Math.round(lateMs / 60_000), policy.roundingMinutes);
        }
      }
    }

    if (shift && workedMinutes > 0) {
      const authorizedBreak = punchWindows?.breakDurationMinutes ?? 0;
      const expectedNet = Math.max(0, shift.scheduledMinutes - authorizedBreak);
      overtimeMinutes = roundMinutesToStep(
        Math.max(0, workedMinutes - expectedNet),
        policy.roundingMinutes,
      );
      if (overtimeMinutes >= policy.overtimeAlertThresholdMinutes && policy.overtimeAlertThresholdMinutes > 0) {
        anomalies.push('OVERTIME_THRESHOLD');
      }
    }

    const isPastDay = day < todayStart;
    let status: TimeGateTimesheetDayStatus;
    if (hasReview) {
      status = TimeGateTimesheetDayStatus.REVIEW_REQUIRED;
    } else if (isHoliday && workedMinutes === 0) {
      status = isPastDay
        ? TimeGateTimesheetDayStatus.CLOSED
        : TimeGateTimesheetDayStatus.OPEN;
      if (!anomalies.includes('HOLIDAY')) {
        anomalies.push('HOLIDAY');
      }
    } else if (!isPastDay) {
      status = TimeGateTimesheetDayStatus.OPEN;
    } else if (anomalies.length > 0 || workedMinutes === 0) {
      status = TimeGateTimesheetDayStatus.OPEN;
    } else {
      status = TimeGateTimesheetDayStatus.CLOSED;
    }

    return {
      workedMinutes: Math.max(0, workedMinutes),
      breakMinutes,
      breakOverrunMinutes: breakResult.breakSurplusMinutes,
      lateMinutes,
      overtimeMinutes,
      status,
      anomalyFlags: anomalies.length ? { flags: anomalies } : null,
    };
  }

  private sumPairedMinutes(
    events: DayEvent[],
    startType: TimeGateAttendanceEventType,
    endType: TimeGateAttendanceEventType,
  ): number {
    let total = 0;
    let openAt: Date | null = null;
    for (const event of events) {
      if (event.type === startType) {
        openAt = event.occurredAt;
      } else if (event.type === endType && openAt) {
        total += this.diffMinutes(openAt, event.occurredAt);
        openAt = null;
      }
    }
    return total;
  }

  private hasUnclosedPair(
    events: DayEvent[],
    startType: TimeGateAttendanceEventType,
    endType: TimeGateAttendanceEventType,
  ): boolean {
    let open = false;
    for (const event of events) {
      if (event.type === startType) open = true;
      if (event.type === endType) open = false;
    }
    return open;
  }

  private buildShiftWindow(
    startTime: Date,
    endTime: Date,
    lateGraceMinutes: number,
  ): ShiftWindow {
    const scheduledMinutes = this.diffMinutes(
      new Date(Date.UTC(1970, 0, 1, startTime.getUTCHours(), startTime.getUTCMinutes())),
      new Date(Date.UTC(1970, 0, 1, endTime.getUTCHours(), endTime.getUTCMinutes())),
    );
    return { startTime, endTime, lateGraceMinutes, scheduledMinutes };
  }

  /** Prefer assignment/punch windows over employee default shift (overnight-safe). */
  private shiftWindowFromPunchWindows(
    punch: ResolvedPunchWindows,
    lateGraceMinutes: number,
  ): ShiftWindow {
    const startTime = new Date(
      Date.UTC(
        1970,
        0,
        1,
        Math.floor(punch.shiftStartMin / 60),
        punch.shiftStartMin % 60,
      ),
    );
    const endTime = new Date(
      Date.UTC(1970, 0, 1, Math.floor(punch.shiftEndMin / 60), punch.shiftEndMin % 60),
    );
    return {
      startTime,
      endTime,
      lateGraceMinutes,
      scheduledMinutes: shiftDurationMinutes(punch.shiftStartMin, punch.shiftEndMin),
    };
  }

  private combineDayAndTime(day: Date, time: Date): Date {
    return new Date(
      Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        0,
      ),
    );
  }

  private diffMinutes(start: Date, end: Date): number {
    let ms = end.getTime() - start.getTime();
    // Overnight shift stored as same-day clock times (end ≤ start) → add 24h.
    if (ms <= 0) ms += 24 * 60 * 60_000;
    return Math.round(ms / 60_000);
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private startOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private endOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999),
    );
  }

  private enumerateDates(from: Date, to: Date): Date[] {
    const days: Date[] = [];
    const cursor = this.startOfUtcDay(from);
    const end = this.startOfUtcDay(to);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }

  private toApiShape(
    row: Prisma.TimeGateTimesheetDayGetPayload<{
      include: {
        employee: {
          select: { id: true; firstName: true; lastName: true; employeeName: true; faceEnrollmentPhoto: true };
        };
      };
    }>,
  ) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      date: row.workDate.toISOString(),
      workedMinutes: row.workedMinutes,
      breakMinutes: row.breakMinutes,
      lateMinutes: row.lateMinutes,
      overtimeMinutes: row.overtimeMinutes,
      status: row.status,
      ruleVersion: row.ruleVersion,
      anomalyFlags: this.normalizeAnomalyFlags(row.anomalyFlags),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }

  private normalizeAnomalyFlags(value: Prisma.JsonValue | null): string[] | null {
    if (!value) return null;
    if (Array.isArray(value)) {
      const flags = value.map(String).filter(Boolean);
      return flags.length ? flags : null;
    }
    if (typeof value === 'object' && value !== null && 'flags' in value) {
      const raw = (value as { flags?: unknown }).flags;
      if (Array.isArray(raw)) {
        const flags = raw.map(String).filter(Boolean);
        return flags.length ? flags : null;
      }
    }
    return null;
  }
}
