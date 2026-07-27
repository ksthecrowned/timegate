import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
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
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { FindPayrollRunsQueryDto } from './dto/find-payroll-runs-query.dto';

const RULE_VERSION = 'v1';
const MONTHLY_HOURS = 173.33;
const WORKING_DAYS_PER_MONTH = 22;

type PayrollLineRow = Prisma.TimeGatePayrollLineGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
  };
}>;

@Injectable()
export class PayrollRunsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePayrollRunDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);

    try {
      const run = await this.prisma.timeGatePayrollRun.create({
        data: {
          id: generateDocId('PRUN'),
          companyId,
          year: dto.year,
          month: dto.month,
          status: TimeGatePayrollRunStatus.DRAFT,
          ruleVersion: RULE_VERSION,
        },
      });

      await this.generateLines(run.id, companyId, dto.year, dto.month);

      return this.findOne(run.id, user);
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

  async findLines(id: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where: { payrollRunId: id },
      orderBy: { employeeId: 'asc' },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });

    return lines.map((line) => this.toLineShape(line));
  }

  async lock(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    if (run.status !== TimeGatePayrollRunStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT payroll runs can be locked');
    }

    const updated = await this.prisma.timeGatePayrollRun.update({
      where: { id },
      data: { status: TimeGatePayrollRunStatus.LOCKED, lockedAt: new Date() },
      include: { _count: { select: { lines: true } } },
    });

    return this.toRunShape(updated);
  }

  async markPaid(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    if (run.status !== TimeGatePayrollRunStatus.LOCKED) {
      throw new BadRequestException('Only LOCKED payroll runs can be marked paid');
    }

    const updated = await this.prisma.timeGatePayrollRun.update({
      where: { id },
      data: { status: TimeGatePayrollRunStatus.PAID, paidAt: new Date() },
      include: { _count: { select: { lines: true } } },
    });

    return this.toRunShape(updated);
  }

  async exportCsv(id: string, user: JwtUser) {
    const run = await this.getRunForMutation(id, user);
    const lines = await this.findLines(id, user);

    const header =
      'employeeId,firstName,lastName,baseSalary,overtimeAmount,penaltyAmount,absenceAmount,bonusAmount,netSalary';
    const body = lines
      .map((line) => {
        const first = line.employee?.firstName ?? '';
        const last = line.employee?.lastName ?? '';
        return [
          line.employeeId,
          first,
          last,
          line.baseSalary,
          line.overtimeAmount,
          line.penaltyAmount,
          line.absenceAmount,
          line.bonusAmount,
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
  ) {
    const { from, to } = this.monthBounds(year, month);

    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: EmployeeStatus.ACTIVE },
      select: { id: true, ctc: true },
    });

    if (!employees.length) return;

    const employeeIds = employees.map((e) => e.id);

    const [salaries, timesheets, absences] = await Promise.all([
      this.prisma.timeGateSalaryRecord.findMany({
        where: { companyId, year, month, employeeId: { in: employeeIds } },
      }),
      this.prisma.timeGateTimesheetDay.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          workDate: { gte: from, lte: to },
        },
        select: {
          employeeId: true,
          lateMinutes: true,
          overtimeMinutes: true,
        },
      }),
      this.prisma.timeGateAbsenceRecord.findMany({
        where: {
          companyId,
          employeeId: { in: employeeIds },
          recordDate: { gte: from, lte: to },
          justified: false,
        },
        select: { employeeId: true },
      }),
    ]);

    const salaryByEmployee = new Map(salaries.map((s) => [s.employeeId, s]));
    const timesheetByEmployee = new Map<
      string,
      { lateMinutes: number; overtimeMinutes: number }
    >();

    for (const row of timesheets) {
      const bucket = timesheetByEmployee.get(row.employeeId) ?? {
        lateMinutes: 0,
        overtimeMinutes: 0,
      };
      bucket.lateMinutes += row.lateMinutes;
      bucket.overtimeMinutes += row.overtimeMinutes;
      timesheetByEmployee.set(row.employeeId, bucket);
    }

    const absenceCountByEmployee = new Map<string, number>();
    for (const row of absences) {
      absenceCountByEmployee.set(
        row.employeeId,
        (absenceCountByEmployee.get(row.employeeId) ?? 0) + 1,
      );
    }

    const hourlyRate = (base: number) => (base > 0 ? base / MONTHLY_HOURS : 0);
    const dailyRate = (base: number) => (base > 0 ? base / WORKING_DAYS_PER_MONTH : 0);

    await this.prisma.timeGatePayrollLine.createMany({
      data: employees.map((employee) => {
        const salary = salaryByEmployee.get(employee.id);
        const baseSalary = salary
          ? fromDecimal(salary.baseSalary)
          : employee.ctc
            ? roundMoney(Number(employee.ctc) / 12)
            : 0;
        const bonuses = salary ? fromDecimal(salary.bonuses) : 0;
        const deductions = salary ? fromDecimal(salary.deductions) : 0;

        const ts = timesheetByEmployee.get(employee.id);
        const lateMinutes = ts?.lateMinutes ?? 0;
        const overtimeMinutes = ts?.overtimeMinutes ?? 0;
        const unjustifiedAbsences = absenceCountByEmployee.get(employee.id) ?? 0;

        const rate = hourlyRate(baseSalary);
        const overtimeAmount = roundMoney((overtimeMinutes / 60) * rate);
        const penaltyAmount = roundMoney((lateMinutes / 60) * rate * 0.5);
        const absenceAmount = roundMoney(unjustifiedAbsences * dailyRate(baseSalary));
        const bonusAmount = bonuses;
        const netSalary = roundMoney(
          baseSalary + overtimeAmount + bonusAmount - penaltyAmount - absenceAmount - deductions,
        );

        return {
          id: generateDocId('PLINE'),
          payrollRunId,
          companyId,
          employeeId: employee.id,
          baseSalary: toDecimal(baseSalary),
          overtimeAmount: toDecimal(overtimeAmount),
          penaltyAmount: toDecimal(penaltyAmount),
          absenceAmount: toDecimal(absenceAmount),
          bonusAmount: toDecimal(bonusAmount),
          netSalary: toDecimal(netSalary),
          explainJson: {
            ruleVersion: RULE_VERSION,
            lateMinutes,
            overtimeMinutes,
            unjustifiedAbsences,
            deductions,
            hourlyRate: roundMoney(rate),
          },
        };
      }),
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
      explainJson: row.explainJson,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
