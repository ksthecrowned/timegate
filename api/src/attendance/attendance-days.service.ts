import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveApplicationStatus,
  Prisma,
  TimeGateAttendanceEventStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import {
  employeeSummarySelect,
  employeeSummaryWithBranchSelect,
  toEmployeeSummary,
} from '../common/utils/employee-summary.util';
import { FindAttendanceDaysQueryDto } from './dto/find-attendance-days-query.dto';
import { ExportAttendanceDaysQueryDto } from './dto/export-attendance-days-query.dto';
import { RecalculateAttendanceDaysDto } from './dto/recalculate-attendance-days.dto';
import { UpdateAttendanceDayDto } from './dto/update-attendance-day.dto';
import { HolidayCalendarService } from '../holidays/holiday-calendar.service';
import { isEmployeeHoliday } from '../common/utils/holiday-calendar.util';

@Injectable()
export class AttendanceDaysService {
  constructor(
    private prisma: PrismaService,
    private holidayCalendar: HolidayCalendarService,
  ) {}

  async findAll(query: FindAttendanceDaysQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);
    const branchId = query.resolvedBranchId();

    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const where: Prisma.AttendanceWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { employee: { branchId } } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.date ? { attendanceDate: this.toDateOnly(query.date) } : {}),
      ...(query.from || query.to
        ? {
            attendanceDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ attendanceDate: 'desc' }, { employeeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: employeeSummaryWithBranchSelect,
          },
          leaveType: { select: { id: true, leaveTypeName: true } },
          shift: { select: { id: true, shiftName: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toDayShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportCsv(query: ExportAttendanceDaysQueryDto, user?: JwtUser) {
    if (!query.from || !query.to) {
      throw new BadRequestException('from and to are required');
    }
    if (new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const companyId = this.resolveCompanyFilter(user);
    const branchId = query.resolvedBranchId();

    const where: Prisma.AttendanceWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { employee: { branchId } } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.date ? { attendanceDate: this.toDateOnly(query.date) } : {}),
      attendanceDate: {
        gte: this.toDateOnly(query.from),
        lte: this.toDateOnly(query.to),
      },
    };

    const items = await this.prisma.attendance.findMany({
      where,
      orderBy: [{ attendanceDate: 'asc' }, { employeeId: 'asc' }],
      include: {
        employee: {
          select: {
            ...employeeSummaryWithBranchSelect,
            branch: { select: { branchName: true } },
          },
        },
        leaveType: { select: { leaveTypeName: true } },
        shift: { select: { shiftName: true } },
        _count: { select: { checkins: true } },
      },
    });

    const header =
      'date,employeeId,firstName,lastName,branch,status,shift,leaveType,checkinsCount';
    const body = items
      .map((row) => {
        const first = row.employee?.firstName ?? '';
        const last = row.employee?.lastName ?? '';
        const branch = row.employee?.branch?.branchName ?? '';
        return [
          row.attendanceDate.toISOString().slice(0, 10),
          row.employeeId,
          first,
          last,
          branch,
          row.status,
          row.shift?.shiftName ?? '',
          row.leaveType?.leaveTypeName ?? '',
          row._count.checkins,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    return {
      filename: `attendance-days-${query.from}_${query.to}.csv`,
      csv: `${header}\n${body}\n`,
    };
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            ...employeeSummaryWithBranchSelect,
            companyId: true,
          },
        },
        leaveType: { select: { id: true, leaveTypeName: true } },
        shift: { select: { id: true, shiftName: true, startTime: true, endTime: true } },
        checkins: { orderBy: { time: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException('Attendance day not found');
    }
    if (user) {
      this.assertCompanyAccess(user, row.companyId ?? row.employee.companyId);
    }
    return this.toDayShape(row);
  }

  async update(id: string, dto: UpdateAttendanceDayDto, user: JwtUser) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
      include: { employee: { select: { companyId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Attendance day not found');
    }
    this.assertCompanyAccess(user, existing.companyId ?? existing.employee.companyId);

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.leaveTypeId !== undefined ? { leaveTypeId: dto.leaveTypeId } : {}),
        ...(dto.shiftId !== undefined ? { shiftId: dto.shiftId } : {}),
      },
      include: {
        employee: {
          select: employeeSummaryWithBranchSelect,
        },
        leaveType: { select: { id: true, leaveTypeName: true } },
        shift: { select: { id: true, shiftName: true, startTime: true, endTime: true } },
      },
    });

    return this.toDayShape(updated);
  }

  /** Recompute daily attendance for one employee after leave approval or change. */
  async syncEmployeeLeaveDays(
    employeeId: string,
    fromDate: Date,
    toDate: Date,
    companyId: string,
  ) {
    const from = this.startOfUtcDay(fromDate);
    const to = this.startOfUtcDay(toDate);
    const user: JwtUser = {
      sub: 'system',
      email: 'system@timegate.local',
      role: TimeGateUserRole.ADMIN,
      companyId,
    };
    return this.recalculate(
      {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        employeeId,
        companyId,
      },
      user,
    );
  }

  async recalculate(dto: RecalculateAttendanceDaysDto, user: JwtUser) {
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

    const branchId = dto.branchId;
    const employees = await this.prisma.employee.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(dto.employeeId ? { id: dto.employeeId } : {}),
        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        defaultShiftId: true,
        holidayListId: true,
      },
    });

    if (!employees.length) {
      return { processed: 0, created: 0, updated: 0, employees: 0 };
    }

    const employeeIds = employees.map((e) => e.id);
    const days = this.enumerateDates(from, to);
    const todayStart = this.startOfUtcDay(new Date());
    const holidayIndex = await this.holidayCalendar.buildIndexForEmployees(employees, from, to);

    const [leaves, checkins, acceptedEvents] = await Promise.all([
      this.prisma.leaveApplication.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: LeaveApplicationStatus.APPROVED,
          fromDate: { lte: to },
          toDate: { gte: from },
        },
        select: { employeeId: true, leaveTypeId: true, fromDate: true, toDate: true },
      }),
      this.prisma.employeeCheckin.findMany({
        where: {
          employeeId: { in: employeeIds },
          time: { gte: from, lte: this.endOfUtcDay(to) },
        },
        select: { employeeId: true, time: true, logType: true },
      }),
      this.prisma.timeGateAttendanceEvent.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: TimeGateAttendanceEventStatus.ACCEPTED,
          occurredAt: { gte: from, lte: this.endOfUtcDay(to) },
        },
        select: { employeeId: true, occurredAt: true, type: true },
      }),
    ]);

    let created = 0;
    let updated = 0;

    for (const employee of employees) {
      const employeeName =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.employeeName;

      for (const day of days) {
        const status = this.resolveDayStatus({
          employeeId: employee.id,
          day,
          todayStart,
          leaves,
          checkins,
          acceptedEvents,
          isHoliday: isEmployeeHoliday(holidayIndex, employee.id, day),
        });

        if (!status) continue;

        const existing = await this.prisma.attendance.findUnique({
          where: {
            employeeId_attendanceDate: {
              employeeId: employee.id,
              attendanceDate: day,
            },
          },
        });

        const leaveTypeId =
          status === AttendanceStatus.ON_LEAVE
            ? leaves.find(
                (l) =>
                  l.employeeId === employee.id &&
                  l.fromDate &&
                  l.toDate &&
                  l.fromDate <= day &&
                  l.toDate >= day,
              )?.leaveTypeId ?? null
            : null;

        if (existing) {
          await this.prisma.attendance.update({
            where: { id: existing.id },
            data: {
              status,
              employeeName,
              leaveTypeId,
              shiftId: employee.defaultShiftId,
            },
          });
          updated += 1;
        } else {
          await this.prisma.attendance.create({
            data: {
              id: generateDocId('ATT'),
              employeeId: employee.id,
              employeeName,
              attendanceDate: day,
              status,
              companyId: employee.companyId,
              shiftId: employee.defaultShiftId,
              leaveTypeId,
            },
          });
          created += 1;
        }
      }
    }

    await this.linkCheckinsToAttendanceDays(employeeIds, from, to);

    return {
      processed: days.length * employees.length,
      created,
      updated,
      employees: employees.length,
      days: days.length,
    };
  }

  /** Mark or refresh daily attendance when a check-in occurs (kiosk / manual). */
  async markPresentFromCheckin(employeeId: string, at: Date) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        defaultShiftId: true,
        status: true,
      },
    });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) return;

    const day = this.startOfUtcDay(at);
    const employeeName =
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.employeeName;

    const onLeave = await this.prisma.leaveApplication.findFirst({
      where: {
        employeeId,
        status: LeaveApplicationStatus.APPROVED,
        fromDate: { lte: day },
        toDate: { gte: day },
      },
    });
    if (onLeave) return;

    const attendance = await this.prisma.attendance.upsert({
      where: {
        employeeId_attendanceDate: { employeeId, attendanceDate: day },
      },
      create: {
        id: generateDocId('ATT'),
        employeeId,
        employeeName,
        attendanceDate: day,
        status: AttendanceStatus.PRESENT,
        companyId: employee.companyId,
        shiftId: employee.defaultShiftId,
      },
      update: {
        status: AttendanceStatus.PRESENT,
        employeeName,
      },
    });

    await this.prisma.employeeCheckin.updateMany({
      where: {
        employeeId,
        attendanceId: null,
        time: { gte: day, lte: this.endOfUtcDay(day) },
      },
      data: { attendanceId: attendance.id },
    });
  }

  private resolveDayStatus(params: {
    employeeId: string;
    day: Date;
    todayStart: Date;
    leaves: Array<{
      employeeId: string;
      leaveTypeId: string;
      fromDate: Date | null;
      toDate: Date | null;
    }>;
    checkins: Array<{ employeeId: string; time: Date; logType: string }>;
    acceptedEvents: Array<{ employeeId: string | null; occurredAt: Date; type: string }>;
    isHoliday: boolean;
  }): AttendanceStatus | null {
    const { employeeId, day, todayStart, leaves, checkins, acceptedEvents, isHoliday } =
      params;

    const onLeave = leaves.some(
      (l) =>
        l.employeeId === employeeId &&
        l.fromDate &&
        l.toDate &&
        l.fromDate <= day &&
        l.toDate >= day,
    );
    if (onLeave) return AttendanceStatus.ON_LEAVE;

    const dayEnd = this.endOfUtcDay(day);
    const hasCheckin = checkins.some(
      (c) => c.employeeId === employeeId && c.time >= day && c.time <= dayEnd,
    );
    const hasAcceptedEvent = acceptedEvents.some(
      (e) =>
        e.employeeId === employeeId && e.occurredAt >= day && e.occurredAt <= dayEnd,
    );

    if (hasCheckin || hasAcceptedEvent) {
      return AttendanceStatus.PRESENT;
    }

    if (isHoliday) {
      return AttendanceStatus.ON_HOLIDAY;
    }

    if (day >= todayStart) {
      return null;
    }

    return AttendanceStatus.ABSENT;
  }

  private async linkCheckinsToAttendanceDays(
    employeeIds: string[],
    from: Date,
    to: Date,
  ) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        attendanceDate: { gte: from, lte: to },
      },
      select: { id: true, employeeId: true, attendanceDate: true },
    });

    for (const att of attendances) {
      await this.prisma.employeeCheckin.updateMany({
        where: {
          employeeId: att.employeeId,
          attendanceId: null,
          time: {
            gte: att.attendanceDate,
            lte: this.endOfUtcDay(att.attendanceDate),
          },
        },
        data: { attendanceId: att.id },
      });
    }
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

  private startOfUtcDay(value: Date): Date {
    const d = new Date(value);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private endOfUtcDay(value: Date): Date {
    const d = this.startOfUtcDay(value);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }

  private toDateOnly(iso: string): Date {
    const d = new Date(iso);
    return this.startOfUtcDay(d);
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toDayShape(row: {
    id: string;
    employeeId: string;
    employeeName: string | null;
    attendanceDate: Date;
    status: AttendanceStatus;
    companyId: string | null;
    shiftId: string | null;
    leaveTypeId: string | null;
    createdAt: Date;
    updatedAt: Date;
    employee?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      employeeName: string;
      faceEnrollmentPhoto?: string | null;
      branchId: string | null;
    } | null;
    leaveType?: { id: string; leaveTypeName: string } | null;
    shift?: { id: string; shiftName: string; startTime: Date | null; endTime: Date | null } | null;
    checkins?: Array<{ id: string; logType: string; time: Date }>;
  }) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
      date: row.attendanceDate.toISOString().slice(0, 10),
      status: row.status,
      companyId: row.companyId,
      shiftId: row.shiftId,
      leaveTypeId: row.leaveTypeId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employee: toEmployeeSummary(row.employee, { includeBranchId: true }),
      leaveType: row.leaveType ?? null,
      shift: row.shift
        ? {
            id: row.shift.id,
            name: row.shift.shiftName,
            startTime: row.shift.startTime?.toISOString() ?? null,
            endTime: row.shift.endTime?.toISOString() ?? null,
          }
        : null,
      checkins: row.checkins?.map((c) => ({
        id: c.id,
        logType: c.logType,
        time: c.time.toISOString(),
      })),
    };
  }
}
