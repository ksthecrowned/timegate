import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  LeaveApplicationStatus,
  AttendanceStatus,
  PayrollLinePaymentStatus,
  Prisma,
  TimeGatePayrollRunStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { fromDecimal, roundMoney, toDecimal } from '../common/utils/money.util';
import { CompensationGridService } from '../compensation-grid/compensation-grid.service';
import { EmployeeCompensationService } from '../employee-compensation/employee-compensation.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { FindPayrollLinesQueryDto } from './dto/find-payroll-lines-query.dto';
import { FindPayrollRunsQueryDto } from './dto/find-payroll-runs-query.dto';
import { MarkLinesPaidDto } from './dto/mark-lines-paid.dto';
import { resolveEmployeePayDay, resolvePayDueDate } from './payroll-due-date.util';
import { computeProrataPay, sumPaidWorkDays } from './payroll-prorata.util';
import { PayrollRunTotals, sumPayrollLineTotals } from './payroll-run-totals.util';
import { PunchWindowService } from '../attendance/punch-window.service';

const RULE_VERSION = 'v3';
const MONTHLY_HOURS = 173.33;

type PayrollLineRow = Prisma.TimeGatePayrollLineGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
  };
}>;

@Injectable()
export class PayrollRunsService {
  constructor(
    private prisma: PrismaService,
    private compensationGrid: CompensationGridService,
    private employeeCompensation: EmployeeCompensationService,
    private punchWindows: PunchWindowService,
  ) {}

  async create(dto: CreatePayrollRunDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);

    try {
      const runId = await this.prisma.$transaction(
        async (tx) => {
          const run = await tx.timeGatePayrollRun.create({
            data: {
              id: generateDocId('PRUN'),
              companyId,
              year: dto.year,
              month: dto.month,
              status: TimeGatePayrollRunStatus.DRAFT,
              ruleVersion: RULE_VERSION,
            },
          });

          await this.generateLines(run.id, companyId, dto.year, dto.month, tx);
          return run.id;
        },
        { timeout: 60_000 },
      );

      return this.findOne(runId, user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Payroll run already exists for this period');
      }
      throw e;
    }
  }

  async findAll(query: FindPayrollRunsQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGatePayrollRunWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.year !== undefined ? { year: query.year } : {}),
      ...(query.month !== undefined ? { month: query.month } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGatePayrollRun.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.timeGatePayrollRun.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toRunShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({
      where: { id },
      include: { _count: { select: { lines: true } } },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);
    return this.toRunShape(run);
  }

  async findLines(id: string, user: JwtUser, query?: FindPayrollLinesQueryDto) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);

    const dueDateFilter: Prisma.DateTimeFilter | undefined =
      query?.dueFrom || query?.dueTo
        ? {
            ...(query?.dueFrom ? { gte: new Date(query.dueFrom) } : {}),
            ...(query?.dueTo ? { lte: new Date(query.dueTo) } : {}),
          }
        : undefined;

    const employeeFilter: Prisma.EmployeeWhereInput | undefined =
      query?.branchId || query?.payGroupId
        ? {
            ...(query?.branchId ? { branchId: query.branchId } : {}),
            ...(query?.payGroupId ? { payGroupId: query.payGroupId } : {}),
          }
        : undefined;

    const where: Prisma.TimeGatePayrollLineWhereInput = {
      payrollRunId: id,
      ...(query?.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(dueDateFilter ? { dueDate: dueDateFilter } : {}),
      ...(employeeFilter ? { employee: employeeFilter } : {}),
    };

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 1000;

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where,
      orderBy: { employeeId: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        employee: { select: employeeSummarySelect },
      },
    });

    return lines.map((line) => this.toLineShape(line));
  }

  async paymentSummaryByBranch(id: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where: { payrollRunId: id },
      select: {
        employeeId: true,
        paymentStatus: true,
        gross: true,
        netSalary: true,
        employee: {
          select: {
            branchId: true,
            branch: { select: { branchName: true } },
            ...employeeSummarySelect,
          },
        },
      },
    });

    type BranchBucket = {
      branchId: string | null;
      branchName: string | null;
      total: number;
      paid: number;
      unpaid: number;
      gross: number;
      net: number;
      unpaidEmployeeIds: string[];
      unpaidEmployees: { id: string; name: string }[];
    };

    const byBranch = new Map<string, BranchBucket>();

    for (const line of lines) {
      const branchId = line.employee?.branchId ?? null;
      const key = branchId ?? '__unassigned__';
      const bucket = byBranch.get(key) ?? {
        branchId,
        branchName: line.employee?.branch?.branchName ?? null,
        total: 0,
        paid: 0,
        unpaid: 0,
        gross: 0,
        net: 0,
        unpaidEmployeeIds: [],
        unpaidEmployees: [],
      };

      bucket.total += 1;
      bucket.gross = roundMoney(bucket.gross + fromDecimal(line.gross));
      bucket.net = roundMoney(bucket.net + fromDecimal(line.netSalary));
      if (line.paymentStatus === PayrollLinePaymentStatus.PAID) {
        bucket.paid += 1;
      } else {
        bucket.unpaid += 1;
        bucket.unpaidEmployeeIds.push(line.employeeId);
        const summary = toEmployeeSummary(line.employee);
        if (summary) {
          const name = `${summary.firstName} ${summary.lastName}`.trim() || summary.id;
          bucket.unpaidEmployees.push({ id: line.employeeId, name });
        }
      }

      byBranch.set(key, bucket);
    }

    return Array.from(byBranch.values()).sort((a, b) =>
      (a.branchName ?? '').localeCompare(b.branchName ?? ''),
    );
  }

  async lock(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    if (run.status !== TimeGatePayrollRunStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT payroll runs can be locked');
    }

    const lockedAt = new Date();
    const updated = await this.prisma.$transaction(
      async (tx) => {
        // Atomic claim: only one concurrent lock wins.
        const claimed = await tx.timeGatePayrollRun.updateMany({
          where: { id, status: TimeGatePayrollRunStatus.DRAFT },
          data: { status: TimeGatePayrollRunStatus.LOCKED, lockedAt },
        });
        if (claimed.count === 0) {
          throw new ConflictException('Payroll run is already locked or no longer draft');
        }

        // Regenerate lines to incorporate variable items added after initial creation
        await tx.timeGatePayrollLine.deleteMany({ where: { payrollRunId: id } });
        await this.generateLines(id, run.companyId, run.year, run.month, tx);

        return tx.timeGatePayrollRun.findUniqueOrThrow({
          where: { id },
          include: { _count: { select: { lines: true } } },
        });
      },
      { timeout: 60_000 },
    );

    return this.toRunShape(updated);
  }

  /** Recompute lines with current attendance / leave / timesheet data. */
  async regenerate(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    const unpaidOnly =
      run.status === TimeGatePayrollRunStatus.LOCKED &&
      run.linesCount > 0 &&
      run.paidCount === 0;
    if (run.status !== TimeGatePayrollRunStatus.DRAFT && !unpaidOnly) {
      throw new BadRequestException(
        'Only DRAFT (or LOCKED with no paid lines) payroll runs can be regenerated',
      );
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await tx.timeGatePayrollRun.update({
          where: { id },
          data: { ruleVersion: RULE_VERSION },
        });
        await tx.timeGatePayrollLine.deleteMany({ where: { payrollRunId: id } });
        await this.generateLines(id, run.companyId, run.year, run.month, tx);
        return tx.timeGatePayrollRun.findUniqueOrThrow({
          where: { id },
          include: { _count: { select: { lines: true } } },
        });
      },
      { timeout: 60_000 },
    );

    return this.toRunShape(updated);
  }

  /** Wrapper: pays every currently-unpaid line on the run, then re-derives run status. */
  async markPaid(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    this.assertPayable(run.status);

    const unpaidLines = await this.prisma.timeGatePayrollLine.findMany({
      where: { payrollRunId: id, paymentStatus: { not: PayrollLinePaymentStatus.PAID } },
      select: { id: true },
    });

    if (!unpaidLines.length) {
      return this.findOne(id, user);
    }

    return this.markLinesPaid(id, user, { lineIds: unpaidLines.map((l) => l.id) });
  }

  async markLinesPaid(id: string, user: JwtUser, dto: MarkLinesPaidDto) {
    const run = await this.getRunForMutation(id, user);
    this.assertPayable(run.status);

    const uniqueLineIds = Array.from(new Set(dto.lineIds));

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where: { id: { in: uniqueLineIds } },
    });

    const foundIds = new Set(lines.map((l) => l.id));
    const missing = uniqueLineIds.filter((lineId) => !foundIds.has(lineId));
    if (missing.length) {
      throw new NotFoundException(`Payroll line(s) not found: ${missing.join(', ')}`);
    }

    const foreign = lines.filter((l) => l.payrollRunId !== id);
    if (foreign.length) {
      throw new BadRequestException('Payroll line(s) do not belong to this payroll run');
    }

    const paidAtDate = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const toPayIds = lines
      .filter((l) => l.paymentStatus !== PayrollLinePaymentStatus.PAID)
      .map((l) => l.id);

    // Wrapped so concurrent mark-paid calls on the same run can't race between the
    // line update and the denormalized run totals/status recompute below.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (toPayIds.length) {
        await tx.timeGatePayrollLine.updateMany({
          where: { id: { in: toPayIds } },
          data: { paymentStatus: PayrollLinePaymentStatus.PAID, paidAt: paidAtDate },
        });
      }

      const allLines = await tx.timeGatePayrollLine.findMany({
        where: { payrollRunId: id },
      });
      const linesCount = allLines.length;
      const paidCount = allLines.filter(
        (l) => l.paymentStatus === PayrollLinePaymentStatus.PAID,
      ).length;

      let newStatus: TimeGatePayrollRunStatus;
      if (linesCount > 0 && paidCount === linesCount) {
        newStatus = TimeGatePayrollRunStatus.PAID;
      } else if (paidCount > 0) {
        newStatus = TimeGatePayrollRunStatus.PARTIALLY_PAID;
      } else {
        newStatus = TimeGatePayrollRunStatus.LOCKED;
      }

      return this.updateRunTotals(
        id,
        allLines,
        {
          status: newStatus,
          ...(newStatus === TimeGatePayrollRunStatus.PAID ? { paidAt: paidAtDate } : {}),
        },
        tx,
      );
    });

    return this.toRunShape(updated);
  }

  private assertPayable(status: TimeGatePayrollRunStatus) {
    if (status === TimeGatePayrollRunStatus.DRAFT) {
      throw new BadRequestException('DRAFT payroll runs cannot be paid; lock the run first');
    }
    if (status === TimeGatePayrollRunStatus.PAID) {
      throw new BadRequestException('Payroll run is already fully paid');
    }
  }

  async exportCsv(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    const lines = await this.findLines(id, user);

    const header =
      'employeeId,firstName,lastName,baseSalary,fixedAllowancesTotal,fixedDeductionsTotal,variableAllowancesTotal,variableDeductionsTotal,overtimeAmount,lateMinutesPenalty,absenceAmount,penaltyAmount,bonusAmount,gross,netSalary';
    const body = lines
      .map((line) => {
        const first = line.employee?.firstName ?? '';
        const last = line.employee?.lastName ?? '';
        return [
          line.employeeId,
          first,
          last,
          line.baseSalary,
          line.fixedAllowancesTotal,
          line.fixedDeductionsTotal,
          line.variableAllowancesTotal,
          line.variableDeductionsTotal,
          line.overtimeAmount,
          line.lateMinutesPenalty,
          line.absenceAmount,
          line.penaltyAmount,
          line.bonusAmount,
          line.gross,
          line.netSalary,
        ].join(',');
      })
      .join('\n');

    return {
      filename: `payroll-${run.year}-${String(run.month).padStart(2, '0')}.csv`,
      csv: `${header}\n${body}\n`,
    };
  }

  private async generateLines(
    payrollRunId: string,
    companyId: string,
    year: number,
    month: number,
    tx: Prisma.TransactionClient,
  ) {
    const { from, to } = this.monthBounds(year, month);

    const employees = await tx.employee.findMany({
      where: { companyId, status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        ctc: true,
        designationId: true,
        employmentTypeId: true,
        payDueDayOverride: true,
        payGroup: { select: { payDayOfMonth: true } },
      },
    });

    if (!employees.length) {
      await this.updateRunTotals(payrollRunId, [], undefined, tx);
      return;
    }

    const employeeIds = employees.map((e) => e.id);

    const [timesheets, absences, approvedLeaves, variableItems, attendances] =
      await Promise.all([
      tx.timeGateTimesheetDay.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          workDate: { gte: from, lte: to },
        },
        select: {
          employeeId: true,
          workDate: true,
          lateMinutes: true,
          overtimeMinutes: true,
        },
      }),
      tx.timeGateAbsenceRecord.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          recordDate: { gte: from, lte: to },
          justified: false,
        },
        select: { employeeId: true, recordDate: true },
      }),
      tx.leaveApplication.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: LeaveApplicationStatus.APPROVED,
          fromDate: { lte: to },
          toDate: { gte: from },
        },
        select: { employeeId: true, fromDate: true, toDate: true },
      }),
      tx.payrollVariableItem.findMany({
        where: { payrollRunId, companyId },
      }),
      tx.attendance.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          attendanceDate: { gte: from, lte: to },
        },
        select: {
          employeeId: true,
          attendanceDate: true,
          status: true,
        },
      }),
    ]);

    const leaveCoversDay = (employeeId: string, day: Date) =>
      approvedLeaves.some(
        (l) =>
          l.employeeId === employeeId &&
          l.fromDate != null &&
          l.toDate != null &&
          l.fromDate <= day &&
          l.toDate >= day,
      );

    const dateKey = (d: Date) => d.toISOString().slice(0, 10);

    const attendanceByEmployee = new Map<string, Map<string, AttendanceStatus>>();
    for (const row of attendances) {
      const byDate =
        attendanceByEmployee.get(row.employeeId) ?? new Map<string, AttendanceStatus>();
      byDate.set(dateKey(row.attendanceDate), row.status);
      attendanceByEmployee.set(row.employeeId, byDate);
    }

    const leaveDaysByEmployee = new Map<string, Set<string>>();
    for (const leave of approvedLeaves) {
      if (!leave.fromDate || !leave.toDate) continue;
      const start = leave.fromDate < from ? from : leave.fromDate;
      const end = leave.toDate > to ? to : leave.toDate;
      const set = leaveDaysByEmployee.get(leave.employeeId) ?? new Set<string>();
      for (
        let cursor = new Date(
          Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
        );
        cursor.getTime() <= end.getTime();
        cursor = new Date(
          Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1),
        )
      ) {
        set.add(dateKey(cursor));
      }
      leaveDaysByEmployee.set(leave.employeeId, set);
    }

    const timesheetByEmployee = new Map<
      string,
      { lateMinutes: number; overtimeMinutes: number }
    >();
    for (const row of timesheets) {
      const onLeave = leaveCoversDay(row.employeeId, row.workDate);
      const bucket = timesheetByEmployee.get(row.employeeId) ?? {
        lateMinutes: 0,
        overtimeMinutes: 0,
      };
      // Congé : pas de retenue retard ; les heures supp. éventuelles restent comptées.
      if (!onLeave) bucket.lateMinutes += row.lateMinutes;
      bucket.overtimeMinutes += row.overtimeMinutes;
      timesheetByEmployee.set(row.employeeId, bucket);
    }

    const absenceCountByEmployee = new Map<string, number>();
    for (const row of absences) {
      // Congé approuvé : aucune retenue même si une absence auto trainait.
      if (leaveCoversDay(row.employeeId, row.recordDate)) continue;
      absenceCountByEmployee.set(
        row.employeeId,
        (absenceCountByEmployee.get(row.employeeId) ?? 0) + 1,
      );
    }

    const variableByEmployee = new Map<string, typeof variableItems>();
    for (const item of variableItems) {
      const list = variableByEmployee.get(item.employeeId) ?? [];
      list.push(item);
      variableByEmployee.set(item.employeeId, list);
    }

    const hourlyRate = (base: number) => (base > 0 ? base / MONTHLY_HOURS : 0);

    const lineData = await Promise.all(
      employees.map(async (employee) => {
        // 1. Contractual base from compensation grid (fallback: ctc/12, then 0)
        let contractualBase = 0;
        let gridFound = false;
        if (employee.designationId && employee.employmentTypeId) {
          const grid = await this.compensationGrid.findEffective(
            companyId,
            employee.designationId,
            employee.employmentTypeId,
            to,
          );
          if (grid) {
            contractualBase = fromDecimal(grid.baseSalary);
            gridFound = true;
          }
        }
        if (!gridFound && employee.ctc) {
          contractualBase = roundMoney(Number(employee.ctc) / 12);
        }

        // 2. Fixed employee allowances/deductions (full month amounts before prorata)
        const fixedItems = await this.employeeCompensation.findActiveForEmployee(
          companyId,
          employee.id,
          to,
        );
        let contractualFixedAllowances = 0;
        let contractualFixedDeductions = 0;
        for (const item of fixedItems) {
          const amt = fromDecimal(item.amount);
          if (item.kind === 'ALLOWANCE') contractualFixedAllowances += amt;
          else contractualFixedDeductions += amt;
        }
        contractualFixedAllowances = roundMoney(contractualFixedAllowances);
        contractualFixedDeductions = roundMoney(contractualFixedDeductions);

        // 3. Variable items for this run (not prorated — already period-specific)
        const vars = variableByEmployee.get(employee.id) ?? [];
        let variableAllowancesTotal = 0;
        let variableDeductionsTotal = 0;
        for (const v of vars) {
          const amt = fromDecimal(v.amount);
          if (v.kind === 'ALLOWANCE') variableAllowancesTotal += amt;
          else variableDeductionsTotal += amt;
        }
        variableAllowancesTotal = roundMoney(variableAllowancesTotal);
        variableDeductionsTotal = roundMoney(variableDeductionsTotal);

        // 4. Timesheet penalties / OT (hourly rate from contractual base)
        const ts = timesheetByEmployee.get(employee.id);
        const lateMinutes = ts?.lateMinutes ?? 0;
        const overtimeMinutes = ts?.overtimeMinutes ?? 0;
        const unjustifiedAbsences = absenceCountByEmployee.get(employee.id) ?? 0;

        const scheduledKeys = await this.punchWindows.listScheduledWorkDateKeys(
          employee.id,
          from,
          to,
        );
        const scheduledSet = new Set(scheduledKeys);
        const scheduledWorkDays = scheduledKeys.length;

        const rawAttendance = attendanceByEmployee.get(employee.id) ?? new Map();
        const attendanceByDate = new Map<string, AttendanceStatus>();
        for (const [key, status] of rawAttendance) {
          if (scheduledSet.has(key)) attendanceByDate.set(key, status);
        }

        const leaveCoveredDateKeys = new Set<string>();
        for (const key of leaveDaysByEmployee.get(employee.id) ?? []) {
          if (scheduledSet.has(key)) leaveCoveredDateKeys.add(key);
        }

        const paidWorkDays = sumPaidWorkDays({
          attendanceByDate,
          leaveCoveredDateKeys,
        });

        const prorata = computeProrataPay({
          contractualBase,
          fixedAllowances: contractualFixedAllowances,
          fixedDeductions: contractualFixedDeductions,
          scheduledWorkDays,
          paidWorkDays,
        });

        const baseSalary = prorata.baseSalary;
        const fixedAllowancesTotal = prorata.fixedAllowancesTotal;
        const fixedDeductionsTotal = prorata.fixedDeductionsTotal;
        const { workDaysDivisor, dailyRate, prorataRatio } = prorata;

        const rate = hourlyRate(contractualBase);
        const overtimeAmount = roundMoney((overtimeMinutes / 60) * rate);
        const lateMinutesPenalty = roundMoney((lateMinutes / 60) * rate);
        // Absences are already reflected in paidWorkDays (prorata réel) — no second deduction.
        const absenceAmount = 0;
        const penaltyAmount = lateMinutesPenalty;

        // 5. Totals
        const bonusAmount = roundMoney(fixedAllowancesTotal + variableAllowancesTotal);
        const totalDeductions = roundMoney(fixedDeductionsTotal + variableDeductionsTotal);
        const gross = roundMoney(baseSalary + bonusAmount + overtimeAmount);
        const netSalary = roundMoney(gross - penaltyAmount - totalDeductions);

        // 6. Pay due date from pay group / employee override
        const payDay = resolveEmployeePayDay(
          employee.payGroup?.payDayOfMonth,
          employee.payDueDayOverride,
        );
        const dueDate = payDay != null ? resolvePayDueDate(year, month, payDay) : null;

        return {
          id: generateDocId('PLINE'),
          payrollRunId,
          companyId,
          employeeId: employee.id,
          dueDate,
          paymentStatus: PayrollLinePaymentStatus.UNPAID,
          baseSalary: toDecimal(baseSalary),
          overtimeAmount: toDecimal(overtimeAmount),
          penaltyAmount: toDecimal(penaltyAmount),
          absenceAmount: toDecimal(absenceAmount),
          bonusAmount: toDecimal(bonusAmount),
          netSalary: toDecimal(netSalary),
          fixedAllowancesTotal: toDecimal(fixedAllowancesTotal),
          fixedDeductionsTotal: toDecimal(fixedDeductionsTotal),
          variableAllowancesTotal: toDecimal(variableAllowancesTotal),
          variableDeductionsTotal: toDecimal(variableDeductionsTotal),
          lateMinutesPenalty: toDecimal(lateMinutesPenalty),
          gross: toDecimal(gross),
          periodStart: from,
          periodEnd: to,
          explainJson: {
            ruleVersion: RULE_VERSION,
            contractualBase,
            paidWorkDays,
            prorataRatio,
            lateMinutes,
            overtimeMinutes,
            unjustifiedAbsences,
            scheduledWorkDays,
            workDaysDivisor,
            dailyRate: roundMoney(dailyRate),
            hourlyRate: roundMoney(rate),
            absenceAmountFoldedIntoProrata: true,
            fixedItems: fixedItems.map((i) => ({
              label: i.label,
              kind: i.kind,
              amount: fromDecimal(i.amount),
            })),
            variableItems: vars.map((v) => ({
              label: v.label,
              kind: v.kind,
              amount: fromDecimal(v.amount),
            })),
          },
        };
      }),
    );

    // createMany + denormalized totals must stay on the same transaction client
    // so a crash between the two cannot leave lines without matching run totals.
    await tx.timeGatePayrollLine.createMany({ data: lineData });
    await this.updateRunTotals(payrollRunId, lineData, undefined, tx);
  }

  private async updateRunTotals(
    payrollRunId: string,
    lines: {
      baseSalary?: Prisma.Decimal | null;
      fixedAllowancesTotal?: Prisma.Decimal | null;
      fixedDeductionsTotal?: Prisma.Decimal | null;
      variableAllowancesTotal?: Prisma.Decimal | null;
      variableDeductionsTotal?: Prisma.Decimal | null;
      overtimeAmount?: Prisma.Decimal | null;
      penaltyAmount?: Prisma.Decimal | null;
      gross?: Prisma.Decimal | null;
      netSalary?: Prisma.Decimal | null;
      paymentStatus: PayrollLinePaymentStatus;
    }[],
    extra?: Pick<Prisma.TimeGatePayrollRunUpdateInput, 'status' | 'paidAt' | 'lockedAt'>,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const totals: PayrollRunTotals = sumPayrollLineTotals(
      lines.map((line) => ({
        baseSalary: line.baseSalary,
        fixedAllowancesTotal: line.fixedAllowancesTotal,
        fixedDeductionsTotal: line.fixedDeductionsTotal,
        variableAllowancesTotal: line.variableAllowancesTotal,
        variableDeductionsTotal: line.variableDeductionsTotal,
        overtimeAmount: line.overtimeAmount,
        penaltyAmount: line.penaltyAmount,
        gross: line.gross,
        netSalary: line.netSalary,
        paymentStatus: line.paymentStatus,
      })),
    );

    return tx.timeGatePayrollRun.update({
      where: { id: payrollRunId },
      data: {
        totalBaseSalary: toDecimal(totals.totalBaseSalary),
        totalFixedAllowances: toDecimal(totals.totalFixedAllowances),
        totalFixedDeductions: toDecimal(totals.totalFixedDeductions),
        totalVariableAllowances: toDecimal(totals.totalVariableAllowances),
        totalVariableDeductions: toDecimal(totals.totalVariableDeductions),
        totalOvertime: toDecimal(totals.totalOvertime),
        totalPenalties: toDecimal(totals.totalPenalties),
        totalGross: toDecimal(totals.totalGross),
        totalNet: toDecimal(totals.totalNet),
        linesCount: totals.linesCount,
        paidCount: totals.paidCount,
        unpaidCount: totals.unpaidCount,
        ...extra,
      },
      include: { _count: { select: { lines: true } } },
    });
  }

  private monthBounds(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    return { from, to };
  }

  private async getRunForMutation(id: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);
    return run;
  }

  private requireCompanyId(user: JwtUser): string {
    if (user.role === PLATFORM_ADMIN) {
      throw new BadRequestException('Super admin must specify company via a dedicated flow');
    }
    if (!user.companyId) {
      throw new BadRequestException('Authenticated user is not linked to a company');
    }
    return user.companyId;
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toRunShape(
    row: Prisma.TimeGatePayrollRunGetPayload<{ include: { _count: { select: { lines: true } } } }>,
  ) {
    const linesCount = row.linesCount;
    const paidCount = row.paidCount;
    const unpaidCount = row.unpaidCount;

    return {
      id: row.id,
      companyId: row.companyId,
      year: row.year,
      month: row.month,
      status: row.status,
      ruleVersion: row.ruleVersion,
      createdAt: row.createdAt.toISOString(),
      lockedAt: row.lockedAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      _count: { lines: row._count.lines },
      totals: {
        baseSalary: fromDecimal(row.totalBaseSalary),
        fixedAllowances: fromDecimal(row.totalFixedAllowances),
        fixedDeductions: fromDecimal(row.totalFixedDeductions),
        variableAllowances: fromDecimal(row.totalVariableAllowances),
        variableDeductions: fromDecimal(row.totalVariableDeductions),
        overtime: fromDecimal(row.totalOvertime),
        penalties: fromDecimal(row.totalPenalties),
        gross: fromDecimal(row.totalGross),
        net: fromDecimal(row.totalNet),
      },
      paymentProgress: {
        linesCount,
        paidCount,
        unpaidCount,
        percentPaid: linesCount > 0 ? roundMoney((paidCount / linesCount) * 100) : 0,
      },
    };
  }

  private toLineShape(row: PayrollLineRow) {
    return {
      id: row.id,
      payrollRunId: row.payrollRunId,
      companyId: row.companyId,
      employeeId: row.employeeId,
      baseSalary: fromDecimal(row.baseSalary),
      overtimeAmount: fromDecimal(row.overtimeAmount),
      penaltyAmount: fromDecimal(row.penaltyAmount),
      absenceAmount: fromDecimal(row.absenceAmount),
      bonusAmount: fromDecimal(row.bonusAmount),
      netSalary: fromDecimal(row.netSalary),
      fixedAllowancesTotal: fromDecimal(row.fixedAllowancesTotal),
      fixedDeductionsTotal: fromDecimal(row.fixedDeductionsTotal),
      variableAllowancesTotal: fromDecimal(row.variableAllowancesTotal),
      variableDeductionsTotal: fromDecimal(row.variableDeductionsTotal),
      lateMinutesPenalty: fromDecimal(row.lateMinutesPenalty),
      gross: fromDecimal(row.gross),
      periodStart: row.periodStart?.toISOString?.() ?? null,
      periodEnd: row.periodEnd?.toISOString?.() ?? null,
      explainJson: row.explainJson,
      dueDate: row.dueDate?.toISOString?.() ?? null,
      paidAt: row.paidAt?.toISOString?.() ?? null,
      paymentStatus: row.paymentStatus,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
