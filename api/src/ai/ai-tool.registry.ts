import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  KioskStatus,
  PayrollLinePaymentStatus,
  TimeGatePayrollRunStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { fromDecimal, roundMoney } from '../common/utils/money.util';
import { employeeSummarySelect } from '../common/utils/employee-summary.util';
import {
  dateKeyAddDays,
  dateKeyInTimeZone,
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { CompensationGridService } from '../compensation-grid/compensation-grid.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { PlanningVsActualQueryDto } from '../dashboard/dto/planning-vs-actual-query.dto';
import { EmployeeCompensationService } from '../employee-compensation/employee-compensation.service';
import { KiosksService } from '../kiosks/kiosks.service';
import { KioskQueryDto } from '../kiosks/dto/kiosk-query.dto';
import { LateRecordsService } from '../late-records/late-records.service';
import { ManagerReportService } from '../manager/manager-report.service';
import { ManagerService, TeamMemberStatus } from '../manager/manager.service';
import { ManagerInboxQueryDto, ManagerTeamTodayQueryDto } from '../manager/dto/manager-query.dto';
import { PayGroupsService } from '../pay-groups/pay-groups.service';
import { FindPayrollLinesQueryDto } from '../payroll-runs/dto/find-payroll-lines-query.dto';
import { FindPayrollRunsQueryDto } from '../payroll-runs/dto/find-payroll-runs-query.dto';
import { PayrollRunsService } from '../payroll-runs/payroll-runs.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SearchQueryDto } from '../search/dto/search-query.dto';
import type { CopilotSource, CopilotToolDefinition } from './ai.types';

/** Names of read-only ADMIN-only payroll tools. Never exposed to / executable by MANAGER. */
const PAYROLL_TOOL_NAMES = new Set([
  'get_payroll_mass',
  'get_payroll_payment_status',
  'get_payroll_due_alerts',
  'list_payroll_runs',
  'compare_payroll_months',
  'get_payroll_by_branch',
  'get_pay_groups',
  'get_employee_compensation',
  'get_upcoming_pay_dues',
]);

@Injectable()
export class AiToolRegistry {
  constructor(
    private readonly manager: ManagerService,
    private readonly managerReport: ManagerReportService,
    private readonly dashboard: DashboardService,
    private readonly lateRecords: LateRecordsService,
    private readonly kiosks: KiosksService,
    private readonly search: SearchService,
    private readonly prisma: PrismaService,
    private readonly payrollRuns: PayrollRunsService,
    private readonly payGroups: PayGroupsService,
    private readonly compensationGrid: CompensationGridService,
    private readonly employeeCompensation: EmployeeCompensationService,
  ) {}

  getDefinitions(user?: JwtUser): CopilotToolDefinition[] {
    const definitions: CopilotToolDefinition[] = [
      {
        name: 'resolve_branch',
        description: 'Trouver une branche/site par nom ou adresse',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'get_team_today',
        description: 'État équipe pour une date: présents, absents, retards, pauses, congés',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            branchId: { type: 'string' },
            statusFilter: {
              type: 'string',
              enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_BREAK', 'ON_LEAVE', 'REVIEW_REQUIRED', 'OFF', 'EXPECTED', 'ALL'],
            },
          },
        },
      },
      {
        name: 'get_manager_inbox',
        description: 'Validations en attente: pointages, congés, swaps, réclamations',
        parameters: { type: 'object', properties: { branchId: { type: 'string' } } },
      },
      {
        name: 'get_weekly_anomalies',
        description: 'Bilan anomalies sur une période (retards, absences, validations)',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'YYYY-MM-DD' },
            to: { type: 'string', description: 'YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'get_late_records',
        description: 'Liste des retards sur une période',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'get_planning_vs_actual',
        description: 'Prévu vs réalisé sur une période',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            branchId: { type: 'string' },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_overtime_leaders',
        description: 'Top employés par heures supplémentaires sur une période',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'get_kiosk_status',
        description: 'Statut des kiosks (online/offline)',
        parameters: {
          type: 'object',
          properties: {
            offlineOnly: { type: 'boolean' },
            branchId: { type: 'string' },
          },
        },
      },
      {
        name: 'search_entities',
        description: 'Rechercher employé, branche, département, kiosk',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ];

    if (user?.role === TimeGateUserRole.ADMIN) {
      definitions.push(...this.payrollToolDefinitions());
    }

    return definitions;
  }

  private payrollToolDefinitions(): CopilotToolDefinition[] {
    return [
      {
        name: 'get_payroll_mass',
        description:
          'Masse salariale (brut/net + détail) d’un mois donné ou du dernier cycle figé. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Année (ex. 2026)' },
            month: { type: 'number', description: 'Mois 1-12' },
          },
        },
      },
      {
        name: 'get_payroll_payment_status',
        description:
          'Liste des employés non payés sur un cycle de paie (filtres branche, groupe de paie, échéance). ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            year: { type: 'number' },
            month: { type: 'number' },
            branchId: { type: 'string' },
            payGroupId: { type: 'string' },
            dueFrom: { type: 'string', description: 'YYYY-MM-DD' },
            dueTo: { type: 'string', description: 'YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'get_payroll_due_alerts',
        description:
          'Échéances de paie proches (J-3/J-1) et en retard pour l’entreprise. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            daysAhead: { type: 'number', description: 'Horizon en jours (défaut 3)' },
          },
        },
      },
      {
        name: 'list_payroll_runs',
        description: 'Liste des cycles de paie et leur statut. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            year: { type: 'number' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'LOCKED', 'PARTIALLY_PAID', 'PAID'],
            },
          },
        },
      },
      {
        name: 'compare_payroll_months',
        description:
          'Compare la masse salariale de deux mois (écarts brut/net). ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            monthA: { type: 'string', description: 'YYYY-MM' },
            monthB: { type: 'string', description: 'YYYY-MM' },
          },
          required: ['monthA', 'monthB'],
        },
      },
      {
        name: 'get_payroll_by_branch',
        description:
          'Masse salariale et reste à payer par branche pour un cycle de paie. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            runId: { type: 'string' },
            year: { type: 'number' },
            month: { type: 'number' },
            branchId: { type: 'string' },
          },
        },
      },
      {
        name: 'get_pay_groups',
        description: 'Groupes de paie de l’entreprise avec jour d’échéance et effectifs. ADMIN uniquement.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'get_employee_compensation',
        description:
          'Grille salariale et majorations (primes/retenues) d’un employé. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            employeeId: { type: 'string' },
            query: { type: 'string', description: 'Nom de l’employé si employeeId inconnu' },
          },
        },
      },
      {
        name: 'get_upcoming_pay_dues',
        description: 'Échéances de paie des prochains jours. ADMIN uniquement.',
        parameters: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Horizon en jours (défaut 7)' },
          },
        },
      },
    ];
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    user: JwtUser,
  ): Promise<{ data: unknown; sources: CopilotSource[] }> {
    if (PAYROLL_TOOL_NAMES.has(name) && user.role !== TimeGateUserRole.ADMIN) {
      throw new ForbiddenException(`Outil réservé aux administrateurs: ${name}`);
    }
    switch (name) {
      case 'resolve_branch':
        return this.resolveBranch(args, user);
      case 'get_team_today':
        return this.getTeamToday(args, user);
      case 'get_manager_inbox':
        return this.getManagerInbox(args, user);
      case 'get_weekly_anomalies':
        return this.getWeeklyAnomalies(args, user);
      case 'get_late_records':
        return this.getLateRecords(args, user);
      case 'get_planning_vs_actual':
        return this.getPlanningVsActual(args, user);
      case 'get_overtime_leaders':
        return this.getOvertimeLeaders(args, user);
      case 'get_kiosk_status':
        return this.getKioskStatus(args, user);
      case 'search_entities':
        return this.searchEntities(args, user);
      case 'get_payroll_mass':
        return this.getPayrollMass(args, user);
      case 'get_payroll_payment_status':
        return this.getPayrollPaymentStatus(args, user);
      case 'get_payroll_due_alerts':
        return this.getPayrollDueAlerts(args, user);
      case 'list_payroll_runs':
        return this.listPayrollRuns(args, user);
      case 'compare_payroll_months':
        return this.comparePayrollMonths(args, user);
      case 'get_payroll_by_branch':
        return this.getPayrollByBranch(args, user);
      case 'get_pay_groups':
        return this.getPayGroups(args, user);
      case 'get_employee_compensation':
        return this.getEmployeeCompensation(args, user);
      case 'get_upcoming_pay_dues':
        return this.getUpcomingPayDues(args, user);
      default:
        throw new BadRequestException(`Outil inconnu: ${name}`);
    }
  }

  private requireCompanyId(user: JwtUser): string {
    if (!user.companyId) throw new BadRequestException('Organisation requise');
    return user.companyId;
  }

  private async resolveTimeZone(user: JwtUser): Promise<string> {
    if (!user.companyId) return resolveOrgTimeZone(null);
    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { timeZone: true },
    });
    return resolveOrgTimeZone(company?.timeZone);
  }

  private toDateOnly(value: unknown | undefined, timeZone: string): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return dateKeyInTimeZone(new Date(), timeZone);
  }

  private weekRange(timeZone: string): { from: string; to: string } {
    const to = dateKeyInTimeZone(new Date(), timeZone);
    return { from: dateKeyAddDays(to, -6), to };
  }

  private monthRange(timeZone: string): { from: string; to: string } {
    const to = dateKeyInTimeZone(new Date(), timeZone);
    const [year, month] = to.split('-');
    return { from: `${year}-${month}-01`, to };
  }

  private sanitizeEmployee(employee: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    employeeName?: string | null;
    photoUrl?: string | null;
  } | null) {
    if (!employee) return null;
    const name =
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
      employee.employeeName ||
      'Employé';
    return { id: employee.id, name };
  }

  private async resolveBranch(args: Record<string, unknown>, user: JwtUser) {
    const query = String(args.query ?? '').trim();
    if (!query) throw new BadRequestException('query requis');
    const dto = new SearchQueryDto();
    dto.q = query;
    dto.limit = 5;
    const result = await this.search.search(dto, user);
    const branches = result.results.branches.map((b) => ({
      id: b.id,
      name: b.label,
      address: b.meta,
    }));
    return { data: { branches }, sources: [] };
  }

  private async getTeamToday(args: Record<string, unknown>, user: JwtUser) {
    const timeZone = await this.resolveTimeZone(user);
    const dto = new ManagerTeamTodayQueryDto();
    dto.date = this.toDateOnly(args.date, timeZone);
    if (typeof args.branchId === 'string') dto.branchId = args.branchId;
    const result = await this.manager.teamToday(dto, user);
    const statusFilter = (args.statusFilter as TeamMemberStatus | 'ALL' | undefined) ?? 'ALL';
    const members =
      statusFilter === 'ALL'
        ? result.members
        : result.members.filter((m) => m.status === statusFilter);

    const data = {
      date: result.date,
      branchId: result.branchId,
      summary: result.summary,
      members: members.map((m) => ({
        employeeId: m.employeeId,
        name: m.employeeName,
        status: m.status,
        branch: m.branch?.name ?? null,
        department: m.department,
        lateMinutes: m.lateMinutes,
        workedMinutes: m.workedMinutes,
      })),
      count: members.length,
    };

    const sources: CopilotSource[] = [
      {
        label: 'Voir l’équipe du jour',
        href: `/manager/team?date=${result.date}${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`,
      },
    ];
    return { data, sources };
  }

  private async getManagerInbox(args: Record<string, unknown>, user: JwtUser) {
    const dto = new ManagerInboxQueryDto();
    if (typeof args.branchId === 'string') dto.branchId = args.branchId;
    dto.limit = 20;
    const result = await this.manager.inbox(dto, user);
    const data = {
      counts: result.counts,
      items: result.items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        employee: this.sanitizeEmployee({
          id: item.employee?.id,
          firstName: item.employee?.firstName,
          lastName: item.employee?.lastName,
        }),
        createdAt: item.createdAt,
      })),
    };
    return {
      data,
      sources: [{ label: 'Boîte de réception manager', href: '/manager/inbox' }],
    };
  }

  private async getWeeklyAnomalies(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const timeZone = await this.resolveTimeZone(user);
    const range =
      args.from && args.to
        ? { from: String(args.from), to: String(args.to) }
        : this.weekRange(timeZone);
    const from = new Date(`${range.from}T00:00:00.000Z`);
    const to = new Date(`${range.to}T00:00:00.000Z`);
    const stats = await this.managerReport.getWeeklyAnomalyStats(companyId, from, to);
    return {
      data: stats,
      sources: [{ label: 'Boîte de réception manager', href: '/manager/inbox' }],
    };
  }

  private async getLateRecords(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const timeZone = await this.resolveTimeZone(user);
    const range =
      args.from && args.to
        ? { from: String(args.from), to: String(args.to) }
        : this.weekRange(timeZone);
    const limit = typeof args.limit === 'number' ? args.limit : 20;
    const query = new PaginationQueryDto();
    query.page = 1;
    query.limit = limit;
    query.from = range.from;
    query.to = range.to;
    const result = await this.lateRecords.findAll(query, companyId);
    return {
      data: {
        period: range,
        total: result.meta.total,
        records: result.data.map((row) => ({
          id: row.id,
          employee: this.sanitizeEmployee({
            id: row.employee?.id,
            firstName: row.employee?.firstName,
            lastName: row.employee?.lastName,
          }),
          date: row.date,
          latenessMinutes: row.latenessMinutes,
          justified: row.justified,
        })),
      },
      sources: [{ label: 'Retards', href: '/late-records' }],
    };
  }

  private async getPlanningVsActual(args: Record<string, unknown>, user: JwtUser) {
    const dto = new PlanningVsActualQueryDto();
    const timeZone = await this.resolveTimeZone(user);
    const range =
      args.from && args.to
        ? { from: String(args.from), to: String(args.to) }
        : this.weekRange(timeZone);
    dto.from = range.from;
    dto.to = range.to;
    if (typeof args.branchId === 'string') dto.branchId = args.branchId;
    const result = await this.dashboard.planningVsActual(dto, user);
    return { data: result, sources: [{ label: 'Tableau de bord', href: '/' }] };
  }

  private async getOvertimeLeaders(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const timeZone = await this.resolveTimeZone(user);
    const range =
      args.from && args.to
        ? { from: String(args.from), to: String(args.to) }
        : this.monthRange(timeZone);
    const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 5;
    const from = new Date(`${range.from}T00:00:00.000Z`);
    const to = new Date(`${range.to}T23:59:59.999Z`);

    const rows = await this.prisma.timeGateTimesheetDay.findMany({
      where: {
        companyId,
        workDate: { gte: from, lte: to },
        overtimeMinutes: { gt: 0 },
      },
      select: {
        employeeId: true,
        overtimeMinutes: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeName: true },
        },
      },
    });

    const totals = new Map<string, { minutes: number; employee: (typeof rows)[0]['employee'] }>();
    for (const row of rows) {
      const current = totals.get(row.employeeId);
      if (current) {
        current.minutes += row.overtimeMinutes;
      } else {
        totals.set(row.employeeId, { minutes: row.overtimeMinutes, employee: row.employee });
      }
    }

    const leaders = [...totals.entries()]
      .map(([employeeId, value]) => ({
        employee: this.sanitizeEmployee(value.employee ?? { id: employeeId }),
        overtimeMinutes: value.minutes,
      }))
      .sort((a, b) => b.overtimeMinutes - a.overtimeMinutes)
      .slice(0, limit);

    return {
      data: { period: range, leaders },
      sources: [{ label: 'Timesheets', href: '/timesheets' }],
    };
  }

  private async getKioskStatus(args: Record<string, unknown>, user: JwtUser) {
    const offlineOnly = args.offlineOnly === true || args.offlineOnly === 'true';
    const dto = new KioskQueryDto();
    dto.page = 1;
    dto.limit = 50;
    if (typeof args.branchId === 'string') dto.branchId = args.branchId;
    const result = await this.kiosks.findAll(dto, user);
    const kiosks = result.data
      .filter((k) => (offlineOnly ? k.status !== KioskStatus.ONLINE : true))
      .map((k) => ({
        id: k.id,
        name: k.name,
        status: k.status,
        branch: k.branch?.name ?? null,
        lastSeenAt: k.lastSeenAt,
        isActive: k.isActive,
      }));

    return {
      data: { total: kiosks.length, kiosks },
      sources: [{ label: 'Kiosks', href: '/kiosks' }],
    };
  }

  private async searchEntities(args: Record<string, unknown>, user: JwtUser) {
    const query = String(args.query ?? '').trim();
    if (!query) throw new BadRequestException('query requis');
    const dto = new SearchQueryDto();
    dto.q = query;
    dto.limit = 5;
    const result = await this.search.search(dto, user);
    const data = {
      employees: result.results.employees.map((e) => ({ id: e.id, name: e.label })),
      branches: result.results.branches.map((b) => ({ id: b.id, name: b.label })),
      departments: result.results.departments.map((d) => ({ id: d.id, name: d.label })),
      kiosks: result.results.kiosks.map((k) => ({ id: k.id, name: k.label })),
    };
    const sources: CopilotSource[] = [];
    if (data.employees[0]) {
      sources.push({ label: data.employees[0].name, href: `/employees/${data.employees[0].id}` });
    }
    return { data, sources };
  }

  /** Resolves a payroll run by runId, or year/month, or the latest non-DRAFT run — always company-scoped. */
  private async resolveRun(
    args: Record<string, unknown>,
    user: JwtUser,
  ): Promise<Awaited<ReturnType<PayrollRunsService['findOne']>> | null> {
    const companyId = this.requireCompanyId(user);

    if (typeof args.runId === 'string' && args.runId.trim()) {
      return this.payrollRuns.findOne(args.runId.trim(), user);
    }

    const year = typeof args.year === 'number' ? args.year : undefined;
    const month = typeof args.month === 'number' ? args.month : undefined;
    if (year && month) {
      const run = await this.prisma.timeGatePayrollRun.findUnique({
        where: { companyId_year_month: { companyId, year, month } },
      });
      if (!run) return null;
      return this.payrollRuns.findOne(run.id, user);
    }

    const latest = await this.prisma.timeGatePayrollRun.findFirst({
      where: { companyId, status: { not: TimeGatePayrollRunStatus.DRAFT } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    if (!latest) return null;
    return this.payrollRuns.findOne(latest.id, user);
  }

  private parseYearMonth(value: unknown): { year: number; month: number } | null {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^(\d{4})-(\d{1,2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  }

  private async getPayrollMass(args: Record<string, unknown>, user: JwtUser) {
    const run = await this.resolveRun(args, user);
    if (!run) {
      return {
        data: { found: false, message: 'Aucun cycle de paie figé trouvé pour cette période.' },
        sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
      };
    }
    return {
      data: {
        run: { id: run.id, year: run.year, month: run.month, status: run.status },
        totals: run.totals,
        paymentProgress: run.paymentProgress,
      },
      sources: [{ label: `Cycle ${run.month}/${run.year}`, href: `/payroll-runs/${run.id}` }],
    };
  }

  private async getPayrollPaymentStatus(args: Record<string, unknown>, user: JwtUser) {
    const run = await this.resolveRun(args, user);
    if (!run) {
      return {
        data: { found: false, message: 'Aucun cycle de paie trouvé pour cette période.' },
        sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
      };
    }

    const query = new FindPayrollLinesQueryDto();
    query.paymentStatus = PayrollLinePaymentStatus.UNPAID;
    if (typeof args.branchId === 'string') query.branchId = args.branchId;
    if (typeof args.payGroupId === 'string') query.payGroupId = args.payGroupId;
    if (typeof args.dueFrom === 'string') query.dueFrom = args.dueFrom;
    if (typeof args.dueTo === 'string') query.dueTo = args.dueTo;

    const lines = await this.payrollRuns.findLines(run.id, user, query);
    const employees = lines.map((line) => ({
      employee: this.sanitizeEmployee(line.employee ?? null),
      dueDate: line.dueDate,
      net: line.netSalary,
    }));

    return {
      data: {
        run: { id: run.id, year: run.year, month: run.month, status: run.status },
        unpaidCount: employees.length,
        employees,
      },
      sources: [{ label: `Cycle ${run.month}/${run.year}`, href: `/payroll-runs/${run.id}` }],
    };
  }

  private async getPayrollDueAlerts(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const timeZone = await this.resolveTimeZone(user);
    const daysAhead = typeof args.daysAhead === 'number' ? Math.min(Math.max(args.daysAhead, 1), 30) : 3;
    const todayKey = dateKeyInTimeZone(new Date(), timeZone);
    const dayStart = new Date(`${todayKey}T00:00:00.000Z`);
    const cutoff = new Date(`${dateKeyAddDays(todayKey, daysAhead)}T00:00:00.000Z`);

    const select = {
      id: true,
      dueDate: true,
      payrollRunId: true,
      employee: { select: employeeSummarySelect },
    };
    const baseWhere = {
      companyId,
      paymentStatus: PayrollLinePaymentStatus.UNPAID,
      payrollRun: { status: { not: TimeGatePayrollRunStatus.DRAFT } },
    };
    const [dueSoonLines, overdueLines] = await Promise.all([
      this.prisma.timeGatePayrollLine.findMany({
        where: { ...baseWhere, dueDate: { gte: dayStart, lte: cutoff } },
        select,
        orderBy: { dueDate: 'asc' },
        take: 100,
      }),
      this.prisma.timeGatePayrollLine.findMany({
        where: { ...baseWhere, dueDate: { not: null, lt: dayStart } },
        select,
        orderBy: { dueDate: 'desc' },
        take: 100,
      }),
    ]);

    const dueSoon: Array<{
      employee: { id?: string; name: string } | null;
      dueDate: string;
      payrollRunId: string;
      daysUntilDue: number;
    }> = [];
    const overdue: typeof dueSoon = [];

    for (const line of dueSoonLines) {
      if (!line.dueDate) continue;
      const daysUntilDue = Math.round((line.dueDate.getTime() - dayStart.getTime()) / 86_400_000);
      dueSoon.push({
        employee: this.sanitizeEmployee(line.employee),
        dueDate: line.dueDate.toISOString().slice(0, 10),
        payrollRunId: line.payrollRunId,
        daysUntilDue,
      });
    }
    for (const line of overdueLines) {
      if (!line.dueDate) continue;
      overdue.push({
        employee: this.sanitizeEmployee(line.employee),
        dueDate: line.dueDate.toISOString().slice(0, 10),
        payrollRunId: line.payrollRunId,
        daysUntilDue: Math.round((line.dueDate.getTime() - dayStart.getTime()) / 86_400_000),
      });
    }

    return {
      data: { dueSoon, overdue, dueSoonCount: dueSoon.length, overdueCount: overdue.length },
      sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
    };
  }

  private async listPayrollRuns(args: Record<string, unknown>, user: JwtUser) {
    const query = new FindPayrollRunsQueryDto();
    query.page = 1;
    query.limit = typeof args.limit === 'number' ? Math.min(Math.max(args.limit, 1), 50) : 12;
    if (
      typeof args.status === 'string' &&
      (Object.values(TimeGatePayrollRunStatus) as string[]).includes(args.status)
    ) {
      query.status = args.status as TimeGatePayrollRunStatus;
    }
    if (typeof args.year === 'number') query.year = args.year;

    const result = await this.payrollRuns.findAll(query, user);
    return {
      data: {
        runs: result.data.map((r) => ({
          id: r.id,
          year: r.year,
          month: r.month,
          status: r.status,
          totals: r.totals,
          paymentProgress: r.paymentProgress,
        })),
        total: result.meta.total,
      },
      sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
    };
  }

  private async comparePayrollMonths(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const a = this.parseYearMonth(args.monthA);
    const b = this.parseYearMonth(args.monthB);
    if (!a || !b) throw new BadRequestException('monthA et monthB requis au format YYYY-MM');

    const [runA, runB] = await Promise.all([
      this.prisma.timeGatePayrollRun.findUnique({
        where: { companyId_year_month: { companyId, year: a.year, month: a.month } },
      }),
      this.prisma.timeGatePayrollRun.findUnique({
        where: { companyId_year_month: { companyId, year: b.year, month: b.month } },
      }),
    ]);

    const shapeA = runA ? await this.payrollRuns.findOne(runA.id, user) : null;
    const shapeB = runB ? await this.payrollRuns.findOne(runB.id, user) : null;

    const diff =
      shapeA && shapeB
        ? {
            gross: roundMoney(shapeB.totals.gross - shapeA.totals.gross),
            net: roundMoney(shapeB.totals.net - shapeA.totals.net),
            linesCount: shapeB.paymentProgress.linesCount - shapeA.paymentProgress.linesCount,
          }
        : null;

    const sources: CopilotSource[] = [];
    if (shapeA) sources.push({ label: `Cycle ${a.month}/${a.year}`, href: `/payroll-runs/${shapeA.id}` });
    if (shapeB) sources.push({ label: `Cycle ${b.month}/${b.year}`, href: `/payroll-runs/${shapeB.id}` });

    return {
      data: {
        monthA: shapeA
          ? { id: shapeA.id, year: shapeA.year, month: shapeA.month, totals: shapeA.totals }
          : { year: a.year, month: a.month, found: false },
        monthB: shapeB
          ? { id: shapeB.id, year: shapeB.year, month: shapeB.month, totals: shapeB.totals }
          : { year: b.year, month: b.month, found: false },
        diff,
      },
      sources,
    };
  }

  private async getPayrollByBranch(args: Record<string, unknown>, user: JwtUser) {
    const run = await this.resolveRun(args, user);
    if (!run) {
      return {
        data: { found: false, message: 'Aucun cycle de paie trouvé pour cette période.' },
        sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
      };
    }

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where: {
        payrollRunId: run.id,
        ...(typeof args.branchId === 'string' ? { employee: { branchId: args.branchId } } : {}),
      },
      select: {
        paymentStatus: true,
        gross: true,
        netSalary: true,
        employee: {
          select: { branchId: true, branch: { select: { branchName: true } }, ...employeeSummarySelect },
        },
      },
    });

    type Bucket = {
      branchId: string | null;
      branchName: string | null;
      total: number;
      paid: number;
      unpaid: number;
      gross: number;
      net: number;
      unpaidEmployees: { id?: string; name: string }[];
    };
    const byBranch = new Map<string, Bucket>();

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
        unpaidEmployees: [],
      };

      bucket.total += 1;
      bucket.gross = roundMoney(bucket.gross + fromDecimal(line.gross));
      bucket.net = roundMoney(bucket.net + fromDecimal(line.netSalary));
      if (line.paymentStatus === PayrollLinePaymentStatus.PAID) {
        bucket.paid += 1;
      } else {
        bucket.unpaid += 1;
        const summary = this.sanitizeEmployee(line.employee ?? null);
        if (summary) bucket.unpaidEmployees.push(summary);
      }

      byBranch.set(key, bucket);
    }

    const branches = Array.from(byBranch.values()).sort((x, y) =>
      (x.branchName ?? '').localeCompare(y.branchName ?? ''),
    );

    return {
      data: {
        run: { id: run.id, year: run.year, month: run.month, status: run.status },
        branches,
      },
      sources: [{ label: `Cycle ${run.month}/${run.year}`, href: `/payroll-runs/${run.id}` }],
    };
  }

  private async getPayGroups(_args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const query = new PaginationQueryDto();
    query.page = 1;
    query.limit = 100;
    const result = await this.payGroups.findAll(query, user);

    const counts = await this.prisma.employee.groupBy({
      by: ['payGroupId'],
      where: { companyId, payGroupId: { not: null } },
      _count: { _all: true },
    });
    const countByGroup = new Map(counts.map((c) => [c.payGroupId as string, c._count._all]));

    const groups = result.data.map((g) => ({
      id: g.id,
      name: g.name,
      payDayOfMonth: g.payDayOfMonth,
      employeeCount: countByGroup.get(g.id) ?? 0,
    }));

    return {
      data: { groups, total: result.meta.total },
      sources: [{ label: 'Groupes de paie', href: '/pay-groups' }],
    };
  }

  private async getEmployeeCompensation(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    let employeeId = typeof args.employeeId === 'string' ? args.employeeId.trim() : '';

    if (!employeeId) {
      const query = String(args.query ?? '').trim();
      if (!query) throw new BadRequestException('employeeId ou query requis');
      const dto = new SearchQueryDto();
      dto.q = query;
      dto.limit = 1;
      const result = await this.search.search(dto, user);
      const match = result.results.employees[0];
      if (!match) {
        return {
          data: { found: false, message: `Aucun employé trouvé pour « ${query} ».` },
          sources: [],
        };
      }
      employeeId = match.id;
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        ctc: true,
        designationId: true,
        employmentTypeId: true,
        payDueDayOverride: true,
        payGroup: { select: { id: true, name: true, payDayOfMonth: true } },
      },
    });
    if (!employee || employee.companyId !== companyId) {
      throw new NotFoundException('Employé introuvable');
    }

    const now = new Date();
    let baseSalary = 0;
    let baseSalarySource: 'grid' | 'ctc' | 'none' = 'none';
    if (employee.designationId && employee.employmentTypeId) {
      const grid = await this.compensationGrid.findEffective(
        companyId,
        employee.designationId,
        employee.employmentTypeId,
        now,
      );
      if (grid) {
        baseSalary = fromDecimal(grid.baseSalary);
        baseSalarySource = 'grid';
      }
    }
    if (baseSalarySource === 'none' && employee.ctc) {
      baseSalary = roundMoney(Number(employee.ctc) / 12);
      baseSalarySource = 'ctc';
    }

    const items = await this.employeeCompensation.findActiveForEmployee(companyId, employee.id, now);
    const allowances = items
      .filter((i) => i.kind === 'ALLOWANCE')
      .map((i) => ({ label: i.label, amount: fromDecimal(i.amount) }));
    const deductions = items
      .filter((i) => i.kind !== 'ALLOWANCE')
      .map((i) => ({ label: i.label, amount: fromDecimal(i.amount) }));

    const summary = this.sanitizeEmployee(employee);

    return {
      data: {
        employee: summary,
        baseSalary,
        baseSalarySource,
        payGroup: employee.payGroup
          ? { id: employee.payGroup.id, name: employee.payGroup.name, payDayOfMonth: employee.payGroup.payDayOfMonth }
          : null,
        payDueDayOverride: employee.payDueDayOverride,
        allowances,
        deductions,
      },
      sources: [{ label: summary?.name ?? 'Employé', href: `/employees/${employee.id}` }],
    };
  }

  private async getUpcomingPayDues(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const timeZone = await this.resolveTimeZone(user);
    const days = typeof args.days === 'number' ? Math.min(Math.max(args.days, 1), 60) : 7;
    const todayKey = dateKeyInTimeZone(new Date(), timeZone);
    const dayStart = new Date(`${todayKey}T00:00:00.000Z`);
    const cutoff = new Date(`${dateKeyAddDays(todayKey, days)}T00:00:00.000Z`);

    const lines = await this.prisma.timeGatePayrollLine.findMany({
      where: {
        companyId,
        paymentStatus: PayrollLinePaymentStatus.UNPAID,
        dueDate: { gte: dayStart, lte: cutoff },
        payrollRun: { status: { not: TimeGatePayrollRunStatus.DRAFT } },
      },
      select: {
        dueDate: true,
        employee: { select: employeeSummarySelect },
      },
      orderBy: { dueDate: 'asc' },
      take: 200,
    });

    const byDate = new Map<string, { date: string; employees: { id?: string; name: string }[] }>();
    for (const line of lines) {
      if (!line.dueDate) continue;
      const key = line.dueDate.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { date: key, employees: [] };
      const summary = this.sanitizeEmployee(line.employee);
      if (summary) bucket.employees.push(summary);
      byDate.set(key, bucket);
    }

    const dues = Array.from(byDate.values()).sort((x, y) => x.date.localeCompare(y.date));

    return {
      data: { days, total: lines.length, dues },
      sources: [{ label: 'Cycles de paie', href: '/payroll-runs' }],
    };
  }
}
