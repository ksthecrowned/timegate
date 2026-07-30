import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveApplicationStatus, Prisma, WeekDay } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { toWeekDay } from '../common/utils/punch-time.util';
import { formatTimeOnly } from '../common/utils/time.util';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningCalendarQueryDto } from './dto/planning-calendar-query.dto';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  async getCalendar(query: PlanningCalendarQueryDto, user: JwtUser) {
    const from = this.toDateOnly(query.from);
    const to = this.toDateOnly(query.to);
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

    const assignmentWhere: Prisma.ShiftAssignmentWhereInput = {
      companyId,
      employee: branchFilter,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: to }, endDate: null },
        { startDate: null, endDate: { gte: from } },
        { startDate: { lte: to }, endDate: { gte: from } },
      ],
    };

    const [assignments, leaves, holidays, exceptions] = await Promise.all([
      this.prisma.shiftAssignment.findMany({
        where: assignmentWhere,
        include: {
          employee: { select: employeeSummarySelect },
          shiftType: {
            select: {
              id: true,
              shiftName: true,
              startTime: true,
              endTime: true,
              weekDays: { select: { day: true } },
            },
          },
          shiftLocation: { select: { id: true, locationName: true } },
        },
        orderBy: [{ startDate: 'asc' }, { employeeId: 'asc' }],
        take: 500,
      }),
      this.prisma.leaveApplication.findMany({
        where: {
          companyId,
          status: { in: [LeaveApplicationStatus.OPEN, LeaveApplicationStatus.APPROVED] },
          employee: branchFilter,
          fromDate: { lte: to },
          toDate: { gte: from },
        },
        include: {
          employee: { select: employeeSummarySelect },
          leaveType: { select: { id: true, leaveTypeName: true } },
        },
        orderBy: { fromDate: 'asc' },
        take: 500,
      }),
      this.prisma.holiday.findMany({
        where: {
          holidayDate: { gte: from, lte: to },
          holidayList: { companyId },
        },
        include: { holidayList: { select: { id: true, holidayListName: true } } },
        orderBy: { holidayDate: 'asc' },
        take: 100,
      }),
      this.prisma.timeGateScheduleDayException.findMany({
        where: {
          companyId,
          workDate: { gte: from, lte: to },
        },
        include: { shiftType: { select: { id: true, shiftName: true } } },
        take: 500,
      }),
    ]);

    const exceptionsByDate = new Map<string, typeof exceptions>();
    for (const ex of exceptions) {
      const key = this.formatDateOnly(ex.workDate);
      const bucket = exceptionsByDate.get(key) ?? [];
      bucket.push(ex);
      exceptionsByDate.set(key, bucket);
    }

    const days = this.enumerateDates(from, to).map((date) => {
      const iso = this.formatDateOnly(date);
      const dayExceptions = exceptionsByDate.get(iso) ?? [];
      const exceptionByShift = new Map(dayExceptions.map((ex) => [ex.shiftTypeId, ex]));

      const fromAssignments = assignments
        .filter((row) => {
          if (!this.coversDate(row.startDate, row.endDate, date)) return false;
          const ex = exceptionByShift.get(row.shiftTypeId);
          if (ex?.isOff) return false;
          if (ex && !ex.isOff) return true; // journée forcée / heures override même hors weekDays
          // One-day assignment (e.g. after a shift swap) forces that calendar day.
          if (this.isSingleDayAssignment(row.startDate, row.endDate, date)) return true;
          return this.isWorkDayForShift(
            date,
            row.shiftType.weekDays.map((w) => w.day),
          );
        })
        .map((row) => {
          const override = exceptionByShift.get(row.shiftTypeId);
          const workOverride = override && !override.isOff ? override : null;
          return {
            id: row.id,
            employee: toEmployeeSummary(row.employee),
            shiftType: {
              id: row.shiftType.id,
              name: row.shiftType.shiftName,
              startTime: workOverride?.startTime ?? row.shiftType.startTime,
              endTime: workOverride?.endTime ?? row.shiftType.endTime,
            },
            shiftLocation: row.shiftLocation
              ? { id: row.shiftLocation.id, name: row.shiftLocation.locationName }
              : null,
            startDate: row.startDate ? this.formatDateOnly(row.startDate) : null,
            endDate: row.endDate ? this.formatDateOnly(row.endDate) : null,
            exception: workOverride
              ? {
                  id: workOverride.id,
                  isOff: false,
                  startTime: workOverride.startTime
                    ? formatTimeOnly(workOverride.startTime)
                    : null,
                  endTime: workOverride.endTime ? formatTimeOnly(workOverride.endTime) : null,
                }
              : null,
          };
        });

      return {
        date: iso,
        assignments: fromAssignments,
        exceptions: dayExceptions.map((ex) => ({
          id: ex.id,
          isOff: ex.isOff,
          startTime: ex.startTime ? formatTimeOnly(ex.startTime) : null,
          endTime: ex.endTime ? formatTimeOnly(ex.endTime) : null,
          note: ex.note,
          shiftType: { id: ex.shiftType.id, name: ex.shiftType.shiftName },
        })),
        leaves: leaves
          .filter((row) => row.fromDate && row.toDate && this.coversDate(row.fromDate, row.toDate, date))
          .map((row) => ({
            id: row.id,
            employee: toEmployeeSummary(row.employee),
            leaveType: row.leaveType.leaveTypeName,
            status: row.status,
            fromDate: row.fromDate ? this.formatDateOnly(row.fromDate) : null,
            toDate: row.toDate ? this.formatDateOnly(row.toDate) : null,
          })),
        holidays: holidays
          .filter((row) => row.holidayDate && this.formatDateOnly(row.holidayDate) === iso)
          .map((row) => ({
            id: row.id,
            name: row.description ?? 'Férié',
            holidayListName: row.holidayList.holidayListName,
          })),
      };
    });

    return { from: query.from, to: query.to, branchId: query.branchId ?? null, days };
  }

  private resolveCompanyFilter(user: JwtUser): string | null {
    if (user.role === 'PLATFORM_ADMIN') return null;
    return user.companyId ?? null;
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

  private toDateOnly(value: string): Date {
    const d = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return d;
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private enumerateDates(from: Date, to: Date): Date[] {
    const days: Date[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      days.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }

  private coversDate(start: Date | null, end: Date | null, day: Date): boolean {
    const d = this.formatDateOnly(day);
    const s = start ? this.formatDateOnly(start) : null;
    const e = end ? this.formatDateOnly(end) : null;
    if (!s && !e) return true;
    if (s && !e) return d >= s;
    if (!s && e) return d <= e;
    return d >= s! && d <= e!;
  }

  /** Affectation bornée à exactement ce jour (ex. suite à un échange de shift). */
  private isSingleDayAssignment(start: Date | null, end: Date | null, day: Date): boolean {
    if (!start || !end) return false;
    const d = this.formatDateOnly(day);
    return this.formatDateOnly(start) === d && this.formatDateOnly(end) === d;
  }

  /** Affectation : uniquement les jours configurés sur l'horaire (liste vide = aucun). */
  private isWorkDayForShift(day: Date, shiftWeekDays: WeekDay[]): boolean {
    if (shiftWeekDays.length === 0) return false;
    return shiftWeekDays.includes(toWeekDay(day));
  }
}
