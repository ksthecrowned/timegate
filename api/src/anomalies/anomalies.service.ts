import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TimeGateAttendanceEventStatus,
  TimeGatePunchClaimStatus,
  TimeGateTimesheetDayStatus,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { CompanyCapabilitiesService } from '../saas/company-capabilities.service';
import { AttendanceService } from '../attendance/attendance.service';
import { PunchClaimsService } from '../punch-claims/punch-claims.service';
import { AuditTrailService } from '../audit/audit-trail.service';
import { ManagerScopeService } from '../manager/manager-scope.service';
import {
  ANOMALY_KINDS,
  type AnomalyKind,
  FindAnomaliesQueryDto,
  ResolveAnomalyDto,
} from './dto/anomaly.dto';

type AnomalyItem = {
  ref: string;
  kind: AnomalyKind;
  type: string;
  status: 'OPEN' | 'RESOLVED';
  companyId: string;
  employeeId: string | null;
  employee?: ReturnType<typeof toEmployeeSummary>;
  workDate: string | null;
  occurredAt: string | null;
  title: string;
  detail: string | null;
  href: string;
  createdAt: string;
};

@Injectable()
export class AnomaliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilities: CompanyCapabilitiesService,
    private readonly attendance: AttendanceService,
    private readonly punchClaims: PunchClaimsService,
    private readonly auditTrail: AuditTrailService,
    private readonly managerScope: ManagerScopeService,
  ) {}

  async findAll(query: FindAnomaliesQueryDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    await this.capabilities.assertCapability(companyId, 'anomaly_workflow');

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const status = query.status ?? 'OPEN';
    const kindFilter = query.kind;
    const scope = await this.managerScope.resolve(user);

    const items: AnomalyItem[] = [];

    if (!kindFilter || kindFilter === 'ATTENDANCE_EVENT') {
      items.push(...(await this.listEventAnomalies(companyId, status)));
    }
    if (!kindFilter || kindFilter === 'PUNCH_CLAIM') {
      items.push(...(await this.listClaimAnomalies(companyId, status)));
    }
    if (!kindFilter || kindFilter === 'TIMESHEET_DAY') {
      items.push(...(await this.listTimesheetAnomalies(companyId, status)));
    }

    let filtered = items;
    if (scope.scoped) {
      const allowed = await this.scopedEmployeeIds(companyId, scope);
      filtered = items.filter(
        (item) => item.employeeId != null && allowed.has(item.employeeId),
      );
    }

    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const total = filtered.length;
    const slice = filtered.slice((page - 1) * limit, page * limit);

    return {
      data: slice,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(ref: string, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    await this.capabilities.assertCapability(companyId, 'anomaly_workflow');
    const { kind, id } = this.parseRef(ref);
    const item = await this.loadOne(kind, id, companyId);
    if (!item) throw new NotFoundException('Anomalie introuvable');
    return item;
  }

  async resolve(ref: string, dto: ResolveAnomalyDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    await this.capabilities.assertCapability(companyId, 'anomaly_workflow');
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('reason is required');

    const { kind, id } = this.parseRef(ref);

    if (kind === 'ATTENDANCE_EVENT') {
      return this.attendance.reviewEvent(
        id,
        {
          status: dto.decision === 'APPROVED' ? 'ACCEPTED' : 'REJECTED',
          reason,
        },
        user,
      );
    }

    if (kind === 'PUNCH_CLAIM') {
      return this.punchClaims.review(
        id,
        {
          status: dto.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          reviewNote: reason,
        },
        user,
      );
    }

    return this.resolveTimesheet(id, dto.decision, reason, user, companyId);
  }

  private async resolveTimesheet(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
    user: JwtUser,
    companyId: string,
  ) {
    const row = await this.prisma.timeGateTimesheetDay.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Timesheet day not found');
    this.assertCompanyAccess(user, row.companyId);
    if (row.companyId !== companyId) throw new ForbiddenException('Access denied');

    if (row.status !== TimeGateTimesheetDayStatus.REVIEW_REQUIRED) {
      throw new BadRequestException('Timesheet is not in REVIEW_REQUIRED');
    }

    const before = { status: row.status };

    if (decision === 'REJECTED') {
      await this.auditTrail.record({
        userId: user.sub,
        companyId: row.companyId,
        action: 'ANOMALY_TIMESHEET_NOTED',
        entity: 'TimeGateTimesheetDay',
        entityId: id,
        reason,
        before,
        after: { status: row.status },
        extra: { anomalyKind: 'TIMESHEET_DAY', decision },
      });
      return {
        ref: `timesheet:${id}`,
        kind: 'TIMESHEET_DAY' as const,
        status: 'OPEN' as const,
        timesheetDayId: id,
        decision,
        reason,
        message: 'Motif enregistré. Corrigez le timesheet via override si nécessaire.',
      };
    }

    const updated = await this.prisma.timeGateTimesheetDay.update({
      where: { id },
      data: { status: TimeGateTimesheetDayStatus.OPEN },
    });

    await this.auditTrail.record({
      userId: user.sub,
      companyId: row.companyId,
      action: 'ANOMALY_TIMESHEET_APPROVED',
      entity: 'TimeGateTimesheetDay',
      entityId: id,
      reason,
      before,
      after: { status: updated.status },
      extra: { anomalyKind: 'TIMESHEET_DAY', decision },
    });

    return {
      ref: `timesheet:${id}`,
      kind: 'TIMESHEET_DAY' as const,
      status: 'RESOLVED' as const,
      timesheetDayId: id,
      decision,
      reason,
    };
  }

  private async listEventAnomalies(companyId: string, status: 'OPEN' | 'RESOLVED') {
    if (status === 'OPEN') {
      const rows = await this.prisma.timeGateAttendanceEvent.findMany({
        where: { companyId, status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED },
        orderBy: { occurredAt: 'desc' },
        take: 200,
        include: { employee: { select: employeeSummarySelect } },
      });
      return rows.map((row) => this.toEventItem(row, 'OPEN'));
    }

    const rows = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        companyId,
        status: {
          in: [TimeGateAttendanceEventStatus.ACCEPTED, TimeGateAttendanceEventStatus.REJECTED],
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { employee: { select: employeeSummarySelect } },
    });

    return rows
      .filter((row) => {
        const meta = this.asRecord(row.meta);
        return Boolean(meta?.reviewedAt) || row.status === TimeGateAttendanceEventStatus.REJECTED;
      })
      .slice(0, 50)
      .map((row) => this.toEventItem(row, 'RESOLVED'));
  }

  private toEventItem(
    row: {
      id: string;
      companyId: string;
      employeeId: string | null;
      type: string;
      status: TimeGateAttendanceEventStatus;
      occurredAt: Date;
      createdAt: Date;
      rejectReason: string | null;
      meta: unknown;
      employee?: Parameters<typeof toEmployeeSummary>[0];
    },
    status: 'OPEN' | 'RESOLVED',
  ): AnomalyItem {
    const meta = this.asRecord(row.meta);
    const type = this.mapEventType(meta?.autoReviewReason);
    return {
      ref: `event:${row.id}`,
      kind: 'ATTENDANCE_EVENT',
      type,
      status,
      companyId: row.companyId,
      employeeId: row.employeeId,
      employee: toEmployeeSummary(row.employee) ?? undefined,
      workDate: row.occurredAt.toISOString().slice(0, 10),
      occurredAt: row.occurredAt.toISOString(),
      title: this.eventTitle(type, row.type),
      detail: typeof meta?.reason === 'string' ? meta.reason : row.rejectReason,
      href: `/attendance/events/${row.id}`,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async listClaimAnomalies(companyId: string, status: 'OPEN' | 'RESOLVED') {
    const rows = await this.prisma.timeGatePunchClaim.findMany({
      where: {
        companyId,
        status:
          status === 'OPEN'
            ? TimeGatePunchClaimStatus.OPEN
            : {
                in: [TimeGatePunchClaimStatus.APPROVED, TimeGatePunchClaimStatus.REJECTED],
              },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { employee: { select: employeeSummarySelect } },
    });

    return rows.map((row) => ({
      ref: `claim:${row.id}`,
      kind: 'PUNCH_CLAIM' as const,
      type: row.type,
      status,
      companyId: row.companyId,
      employeeId: row.employeeId,
      employee: toEmployeeSummary(row.employee) ?? undefined,
      workDate: row.workDate.toISOString().slice(0, 10),
      occurredAt: null,
      title: `Réclamation : ${row.type}`,
      detail: row.reason,
      href: `/punch-claims/${row.id}`,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async listTimesheetAnomalies(companyId: string, status: 'OPEN' | 'RESOLVED') {
    if (status === 'RESOLVED') {
      const overrides = await this.prisma.timeGateTimesheetOverride.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          timesheetDay: {
            include: { employee: { select: employeeSummarySelect } },
          },
        },
      });
      return overrides.map((row) => ({
        ref: `timesheet:${row.timesheetDayId}`,
        kind: 'TIMESHEET_DAY' as const,
        type: 'TIMESHEET_OVERRIDE',
        status: 'RESOLVED' as const,
        companyId: row.companyId,
        employeeId: row.timesheetDay.employeeId,
        employee: toEmployeeSummary(row.timesheetDay.employee) ?? undefined,
        workDate: row.timesheetDay.workDate.toISOString().slice(0, 10),
        occurredAt: null,
        title: 'Timesheet corrigé',
        detail: row.reason,
        href: `/timesheets/${row.timesheetDayId}`,
        createdAt: row.createdAt.toISOString(),
      }));
    }

    const rows = await this.prisma.timeGateTimesheetDay.findMany({
      where: { companyId, status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED },
      orderBy: { workDate: 'desc' },
      take: 200,
      include: { employee: { select: employeeSummarySelect } },
    });

    return rows.map((row) => {
      const flags = this.normalizeFlags(row.anomalyFlags);
      return {
        ref: `timesheet:${row.id}`,
        kind: 'TIMESHEET_DAY' as const,
        type: flags[0] ?? 'TIMESHEET_REVIEW',
        status: 'OPEN' as const,
        companyId: row.companyId,
        employeeId: row.employeeId,
        employee: toEmployeeSummary(row.employee) ?? undefined,
        workDate: row.workDate.toISOString().slice(0, 10),
        occurredAt: null,
        title: 'Timesheet à revoir',
        detail: flags.length ? flags.join(', ') : null,
        href: `/timesheets/${row.id}`,
        createdAt: row.updatedAt.toISOString(),
      };
    });
  }

  private async loadOne(kind: AnomalyKind, id: string, companyId: string) {
    const open = await this.findInLists(kind, id, companyId, 'OPEN');
    if (open) return open;
    return this.findInLists(kind, id, companyId, 'RESOLVED');
  }

  private async findInLists(
    kind: AnomalyKind,
    id: string,
    companyId: string,
    status: 'OPEN' | 'RESOLVED',
  ) {
    const prefix =
      kind === 'ATTENDANCE_EVENT' ? 'event' : kind === 'PUNCH_CLAIM' ? 'claim' : 'timesheet';
    const ref = `${prefix}:${id}`;
    const list =
      kind === 'ATTENDANCE_EVENT'
        ? await this.listEventAnomalies(companyId, status)
        : kind === 'PUNCH_CLAIM'
          ? await this.listClaimAnomalies(companyId, status)
          : await this.listTimesheetAnomalies(companyId, status);
    return list.find((i) => i.ref === ref) ?? null;
  }

  private parseRef(ref: string): { kind: AnomalyKind; id: string } {
    const [prefix, ...rest] = ref.split(':');
    const id = rest.join(':');
    if (!id) throw new BadRequestException('Référence anomalie invalide');
    if (prefix === 'event') return { kind: 'ATTENDANCE_EVENT', id };
    if (prefix === 'claim') return { kind: 'PUNCH_CLAIM', id };
    if (prefix === 'timesheet') return { kind: 'TIMESHEET_DAY', id };
    if ((ANOMALY_KINDS as readonly string[]).includes(prefix)) {
      return { kind: prefix as AnomalyKind, id };
    }
    throw new BadRequestException('Référence anomalie invalide');
  }

  private mapEventType(autoReviewReason: unknown): string {
    if (autoReviewReason === 'KIOSK_OTHER_SITE') return 'WRONG_SITE';
    if (autoReviewReason === 'LATE_CHECKIN') return 'LATE_ARRIVAL';
    if (autoReviewReason === 'LOW_CONFIDENCE') return 'LOW_CONFIDENCE';
    if (typeof autoReviewReason === 'string' && autoReviewReason) return autoReviewReason;
    return 'REVIEW_REQUIRED';
  }

  private eventTitle(type: string, eventType: string): string {
    const labels: Record<string, string> = {
      WRONG_SITE: 'Mauvais site',
      LATE_ARRIVAL: 'Arrivée tardive',
      LOW_CONFIDENCE: 'Confiance insuffisante',
      REVIEW_REQUIRED: 'Pointage à valider',
    };
    return `${labels[type] ?? type} · ${eventType}`;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private normalizeFlags(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string');
    }
    const obj = this.asRecord(value);
    if (obj && Array.isArray(obj.flags)) {
      return obj.flags.filter((v): v is string => typeof v === 'string');
    }
    return [];
  }

  private async scopedEmployeeIds(
    companyId: string,
    scope: Awaited<ReturnType<ManagerScopeService['resolve']>>,
  ): Promise<Set<string>> {
    const where = this.managerScope.employeeWhere(scope);
    if (!where) return new Set();
    const rows = await this.prisma.employee.findMany({
      where: { companyId, ...where },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  private requireCompanyId(user: JwtUser): string {
    if (user.role === PLATFORM_ADMIN) {
      throw new BadRequestException('Filtre company requis pour PLATFORM_ADMIN');
    }
    if (!user.companyId) throw new ForbiddenException('Company required');
    return user.companyId;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access denied');
    }
  }
}
