import { BadRequestException, Injectable } from '@nestjs/common';
import { KioskStatus } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { PlanningVsActualQueryDto } from '../dashboard/dto/planning-vs-actual-query.dto';
import { KiosksService } from '../kiosks/kiosks.service';
import { KioskQueryDto } from '../kiosks/dto/kiosk-query.dto';
import { LateRecordsService } from '../late-records/late-records.service';
import { ManagerReportService } from '../manager/manager-report.service';
import { ManagerService, TeamMemberStatus } from '../manager/manager.service';
import { ManagerInboxQueryDto, ManagerTeamTodayQueryDto } from '../manager/dto/manager-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SearchQueryDto } from '../search/dto/search-query.dto';
import type { CopilotSource, CopilotToolDefinition } from './ai.types';

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
  ) {}

  getDefinitions(): CopilotToolDefinition[] {
    return [
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
              enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_BREAK', 'ON_LEAVE', 'REVIEW_REQUIRED', 'ALL'],
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
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    user: JwtUser,
  ): Promise<{ data: unknown; sources: CopilotSource[] }> {
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
      default:
        throw new BadRequestException(`Outil inconnu: ${name}`);
    }
  }

  private requireCompanyId(user: JwtUser): string {
    if (!user.companyId) throw new BadRequestException('Organisation requise');
    return user.companyId;
  }

  private toDateOnly(value?: unknown): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date().toISOString().slice(0, 10);
  }

  private weekRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 6);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  private monthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
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
    const dto = new ManagerTeamTodayQueryDto();
    dto.date = this.toDateOnly(args.date);
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
    const range = args.from && args.to ? { from: String(args.from), to: String(args.to) } : this.weekRange();
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
    const range = args.from && args.to ? { from: String(args.from), to: String(args.to) } : this.weekRange();
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
    const range =
      args.from && args.to
        ? { from: String(args.from), to: String(args.to) }
        : this.weekRange();
    dto.from = range.from;
    dto.to = range.to;
    if (typeof args.branchId === 'string') dto.branchId = args.branchId;
    const result = await this.dashboard.planningVsActual(dto, user);
    return { data: result, sources: [{ label: 'Tableau de bord', href: '/' }] };
  }

  private async getOvertimeLeaders(args: Record<string, unknown>, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const range = args.from && args.to ? { from: String(args.from), to: String(args.to) } : this.monthRange();
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
}
