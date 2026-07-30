import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateAttendanceAuthMethod,
} from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { resolveAttendancePunch } from './attendance-punch-resolver';
import { AttendancePunchRecorderService } from './attendance-punch-recorder.service';
import {
  buildDayPunchStateFromEvents,
  PunchWindowService,
} from './punch-window.service';
import {
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import {
  DEFAULT_BRANCH_CHECKIN_RADIUS_M,
  isWithinBranchRadius,
} from '../common/utils/geo.util';
import { PrismaService } from '../prisma/prisma.service';

export type BreakResumeStatus = {
  eligible: boolean;
  reason: string | null;
  requiresGeo: boolean;
  branch: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    checkinRadiusMeters: number;
  } | null;
};

@Injectable()
export class EmployeeBreakPunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly punchRecorder: AttendancePunchRecorderService,
  ) {}

  async getBreakResumeStatus(user: JwtUser): Promise<BreakResumeStatus> {
    if (user.deviceTrust && user.deviceTrust !== 'TRUSTED') {
      return {
        eligible: false,
        reason: 'Appareil en attente de validation. Reprise de pause indisponible.',
        requiresGeo: false,
        branch: null,
      };
    }
    const ctx = await this.loadEmployeeContext(user);
    const branchGeo = this.branchGeoShape(ctx.branch);
    const resolution = await this.resolveNow(ctx.employeeId, ctx.companyId, new Date());

    if (!resolution.windows) {
      return {
        eligible: false,
        reason: 'Horaires de pointage non configurés.',
        requiresGeo: false,
        branch: branchGeo,
      };
    }

    if (resolution.resolution.action === 'BREAK_END') {
      const requiresGeo = branchGeo != null && branchGeo.latitude != null && branchGeo.longitude != null;
      if (requiresGeo) {
        return { eligible: true, reason: null, requiresGeo: true, branch: branchGeo };
      }
      return {
        eligible: false,
        reason: 'Géolocalisation du site non configurée. Utilisez le kiosk.',
        requiresGeo: false,
        branch: branchGeo,
      };
    }

    return {
      eligible: false,
      reason: resolution.resolution.message,
      requiresGeo: false,
      branch: branchGeo,
    };
  }

  async resumeBreak(
    user: JwtUser,
    coords: { latitude: number; longitude: number },
  ): Promise<{ message: string }> {
    const ctx = await this.loadEmployeeContext(user);
    const branch = ctx.branch;

    if (branch.latitude == null || branch.longitude == null) {
      throw new BadRequestException(
        'Géolocalisation du site non configurée. Reprise via kiosk uniquement.',
      );
    }

    const branchLat = Number(branch.latitude);
    const branchLng = Number(branch.longitude);
    if (
      !isWithinBranchRadius(
        coords.latitude,
        coords.longitude,
        branchLat,
        branchLng,
        branch.checkinRadius,
      )
    ) {
      throw new ForbiddenException(
        `Vous devez être sur le site (${branch.branchName}) pour reprendre la pause.`,
      );
    }

    const occurredAt = new Date();
    const resolution = await this.resolveNow(ctx.employeeId, ctx.companyId, occurredAt);

    if (!resolution.windows) {
      throw new BadRequestException('Horaires de pointage non configurés.');
    }

    if (resolution.resolution.action !== 'BREAK_END') {
      throw new BadRequestException(resolution.resolution.message);
    }

    const kiosk = await this.prisma.timeGateKiosk.findFirst({
      where: { branchId: ctx.branchId, isActive: true },
      select: { id: true },
    });
    if (!kiosk) {
      throw new BadRequestException('Aucun kiosk actif sur votre site.');
    }

    const { message } = await this.punchRecorder.recordEvent({
      employeeId: ctx.employeeId,
      kioskId: kiosk.id,
      branchId: ctx.branchId,
      companyId: ctx.companyId,
      confidence: 1,
      source: TimeGateAttendanceEventSource.EMPLOYEE_APP,
      occurredAt,
      eventType: TimeGateAttendanceEventType.BREAK_END,
      employeeBranchId: ctx.branchId,
      wrongSite: false,
      idempotencySuffix: 'break_end_mobile',
      authMethod: TimeGateAttendanceAuthMethod.MOBILE,
      idempotencyKey: `employee-app:${ctx.employeeId}:break_end:${occurredAt.toISOString().slice(0, 16)}`,
    });

    return { message: resolution.resolution.message || message };
  }

  private async loadEmployeeContext(user: JwtUser) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('Profil employé requis');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        status: true,
        branch: {
          select: {
            id: true,
            branchName: true,
            latitude: true,
            longitude: true,
            checkinRadius: true,
          },
        },
      },
    });

    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      throw new NotFoundException('Employé introuvable ou inactif');
    }
    if (!employee.branchId || !employee.branch) {
      throw new BadRequestException("Employé sans site d'affectation.");
    }

    return {
      employeeId: employee.id,
      companyId: employee.companyId,
      branchId: employee.branchId,
      branch: employee.branch,
    };
  }

  private branchGeoShape(
    branch: {
      id: string;
      branchName: string;
      latitude: unknown;
      longitude: unknown;
      checkinRadius: number | null;
    } | null,
  ): BreakResumeStatus['branch'] {
    if (!branch) return null;
    return {
      id: branch.id,
      name: branch.branchName,
      latitude: branch.latitude != null ? Number(branch.latitude) : null,
      longitude: branch.longitude != null ? Number(branch.longitude) : null,
      checkinRadiusMeters: branch.checkinRadius ?? DEFAULT_BRANCH_CHECKIN_RADIUS_M,
    };
  }

  private async resolveNow(employeeId: string, companyId: string, occurredAt: Date) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { timeZone: true },
    });
    const timeZone = resolveOrgTimeZone(company?.timeZone);
    const punchCtx = await this.punchWindows.resolvePunchContext(
      employeeId,
      occurredAt,
      timeZone,
    );
    const windows = punchCtx.windows;
    if (!windows) {
      return {
        windows: null as null,
        resolution: { action: 'REJECTED' as const, message: 'Horaires non configurés.' },
      };
    }

    const todaysEvents = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        employeeId,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        occurredAt: { gte: punchCtx.bounds.start, lte: punchCtx.bounds.end },
      },
      orderBy: { occurredAt: 'asc' },
      select: { type: true, occurredAt: true },
    });

    const state = buildDayPunchStateFromEvents(todaysEvents, timeZone);
    const resolution = resolveAttendancePunch(punchCtx.atMin, windows, state);

    return { windows, resolution };
  }
}
