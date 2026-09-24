import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  TimeGateAttendanceEvent,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateAttendanceAuthMethod,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import type { VerificationContext } from '../common/utils/verification-context.util';
import {
  formatPunchFeedbackMessage,
  punchReviewReasonLabel,
  type PunchLocationSummary,
} from '../common/utils/punch-feedback.util';
import { AttendanceEventStatusService } from './attendance-event-status.service';
import { NotificationsService } from '../notifications/notifications.service';

export type RecordPunchEventParams = {
  employeeId: string;
  kioskId: string;
  branchId: string;
  companyId: string;
  confidence: number;
  verificationRef?: string;
  source?: TimeGateAttendanceEventSource;
  occurredAt: Date;
  eventType: TimeGateAttendanceEventType;
  employeeBranchId: string;
  wrongSite: boolean;
  lateAbsent?: boolean;
  /** Affectation sur ce lieu déjà terminée (REVIEW). */
  assignmentExpired?: boolean;
  /** Lieu archivé / inactif (REVIEW). */
  locationArchived?: boolean;
  idempotencySuffix: string;
  authMethod?: TimeGateAttendanceAuthMethod;
  idempotencyKey?: string;
  trustedDeviceId?: string | null;
};

export type RecordPunchEventResult = {
  message: string;
  event: TimeGateAttendanceEvent;
  status: TimeGateAttendanceEventStatus;
  reviewReasonCode: string | null;
  reviewReasonLabel: string | null;
  location: PunchLocationSummary | null;
};

@Injectable()
export class AttendancePunchRecorderService {
  private readonly logger = new Logger(AttendancePunchRecorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStatus: AttendanceEventStatusService,
    private readonly notifications: NotificationsService,
  ) {}

  async recordEvent(
    params: RecordPunchEventParams,
  ): Promise<RecordPunchEventResult> {
    let { status, autoReviewReason } = await this.eventStatus.resolveForCompany(
      params.companyId,
      params.confidence,
    );

    if (params.wrongSite) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'KIOSK_OTHER_SITE';
    } else if (params.locationArchived) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'LOCATION_ARCHIVED';
    } else if (params.assignmentExpired) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'ASSIGNMENT_EXPIRED';
    } else if (params.lateAbsent) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'LATE_CHECKIN';
    }

    const reviewReasonLabel = punchReviewReasonLabel(autoReviewReason, {
      wrongSite: params.wrongSite,
    });
    const pendingMeta = this.eventStatus.buildPendingMeta({ status, autoReviewReason });
    const verificationContext = await this.buildVerificationContext(params);
    const location = verificationContext.location;
    const meta = {
      ...(pendingMeta && typeof pendingMeta === 'object' ? pendingMeta : {}),
      ...(params.lateAbsent ? { lateAbsent: true } : {}),
      ...(params.assignmentExpired ? { assignmentExpired: true } : {}),
      ...(params.locationArchived ? { locationArchived: true } : {}),
      verificationContext,
    };

    const idempotencyKey =
      params.idempotencyKey ??
      (params.verificationRef
        ? `verify:${params.verificationRef}:attendance:${params.idempotencySuffix}`
        : undefined);

    let event: TimeGateAttendanceEvent;
    try {
      event = await this.prisma.timeGateAttendanceEvent.create({
        data: {
          id: generateDocId('AEV'),
          companyId: params.companyId,
          branchId: params.branchId,
          kioskId: params.kioskId,
          employeeId: params.employeeId,
          source: params.source ?? TimeGateAttendanceEventSource.KIOSK_ONLINE,
          type: params.eventType,
          status,
          occurredAt: params.occurredAt,
          confidence: params.confidence,
          verificationRef: params.verificationRef,
          idempotencyKey,
          authMethod: params.authMethod,
          meta: meta as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Hardening P — concurrence / double scan : unique (companyId, idempotencyKey)
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        idempotencyKey
      ) {
        const existing = await this.prisma.timeGateAttendanceEvent.findFirst({
          where: { companyId: params.companyId, idempotencyKey },
        });
        if (existing) {
          this.logger.debug(`Idempotent punch replay: ${idempotencyKey}`);
          const existingMeta =
            existing.meta && typeof existing.meta === 'object'
              ? (existing.meta as Record<string, unknown>)
              : {};
          const existingVc = existingMeta.verificationContext as
            | VerificationContext
            | undefined;
          const existingCode =
            typeof existingMeta.autoReviewReason === 'string'
              ? existingMeta.autoReviewReason
              : null;
          return {
            message: this.describeExisting(existing),
            event: existing,
            status: existing.status,
            reviewReasonCode: existingCode,
            reviewReasonLabel: punchReviewReasonLabel(existingCode),
            location: existingVc?.location ?? null,
          };
        }
      }
      throw err;
    }

    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: params.employeeId },
        select: { firstName: true, lastName: true, employeeName: true },
      });
      const employeeName =
        `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim() ||
        employee?.employeeName ||
        'Employé';
      await this.notifications.notifyPunchEvent({
        companyId: params.companyId,
        branchId: params.branchId,
        employeeId: params.employeeId,
        employeeName,
        eventType: params.eventType,
        occurredAt: params.occurredAt,
        reviewRequired: status === TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
        lateAbsent: params.lateAbsent,
        reviewReason: reviewReasonLabel ?? this.describeReviewReason(autoReviewReason, params.wrongSite),
      });
    } catch (err) {
      this.logger.warn(`Punch notification failed: ${err instanceof Error ? err.message : err}`);
    }

    const defaultMessage =
      params.eventType === TimeGateAttendanceEventType.CHECK_IN
        ? "Pointage d'arrivee enregistre."
        : params.eventType === TimeGateAttendanceEventType.BREAK_END
          ? 'Reprise de pause enregistree.'
          : 'Pointage de fin enregistre.';

    const locationName = location
      ? location.clientLabel
        ? `${location.name} (${location.clientLabel})`
        : location.name
      : null;

    if (status === TimeGateAttendanceEventStatus.ACCEPTED) {
      await this.eventStatus.materializeAcceptedEvent(event);
      return {
        message: formatPunchFeedbackMessage(defaultMessage, {
          status,
          locationName,
        }),
        event,
        status,
        reviewReasonCode: null,
        reviewReasonLabel: null,
        location,
      };
    }

    return {
      message: formatPunchFeedbackMessage(defaultMessage, {
        status,
        reviewReasonLabel,
        locationName,
      }),
      event,
      status,
      reviewReasonCode: autoReviewReason ?? null,
      reviewReasonLabel,
      location,
    };
  }

  private async buildVerificationContext(
    params: RecordPunchEventParams,
  ): Promise<VerificationContext> {
    const recordedAt = new Date().toISOString();
    const occurredAtIso = params.occurredAt.toISOString();

    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id: params.kioskId },
      select: {
        id: true,
        kioskName: true,
        locationId: true,
        location: {
          select: { id: true, name: true, type: true, clientLabel: true },
        },
        clientMission: {
          select: { id: true, title: true, publicSlug: true },
        },
      },
    });

    const day = new Date(
      Date.UTC(
        params.occurredAt.getUTCFullYear(),
        params.occurredAt.getUTCMonth(),
        params.occurredAt.getUTCDate(),
      ),
    );
    const dayKey = day.toISOString().slice(0, 10);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { employeeId: params.employeeId },
      select: {
        id: true,
        locationId: true,
        shiftTypeId: true,
        startDate: true,
        endDate: true,
        shiftType: { select: { id: true, shiftName: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const covering = assignments.find((row) => {
      const s = row.startDate ? row.startDate.toISOString().slice(0, 10) : null;
      const e = row.endDate ? row.endDate.toISOString().slice(0, 10) : null;
      if (!s && !e) return true;
      if (s && !e) return dayKey >= s;
      if (!s && e) return dayKey <= e;
      return dayKey >= s! && dayKey <= e!;
    });

    const mission = kiosk?.clientMission ?? null;

    return {
      version: 1,
      employeeId: params.employeeId,
      location: kiosk?.location
        ? {
            id: kiosk.location.id,
            name: kiosk.location.name,
            type: kiosk.location.type,
            clientLabel: kiosk.location.clientLabel,
          }
        : null,
      mission: mission
        ? {
            id: mission.id,
            title: mission.title,
            publicSlug: mission.publicSlug,
          }
        : null,
      kiosk: kiosk
        ? {
            id: kiosk.id,
            name: kiosk.kioskName,
            channel: mission ? 'client_page' : 'kiosk',
          }
        : {
            id: params.kioskId,
            name: params.kioskId,
            channel: 'kiosk',
          },
      authMethod: params.authMethod ?? null,
      device: params.trustedDeviceId
        ? { trustedDeviceId: params.trustedDeviceId }
        : null,
      assignment: covering
        ? {
            id: covering.id,
            locationId: covering.locationId,
            shiftTypeId: covering.shiftTypeId,
          }
        : null,
      shift: covering?.shiftType
        ? { id: covering.shiftType.id, name: covering.shiftType.shiftName }
        : null,
      timestamps: {
        occurredAt: occurredAtIso,
        recordedAt,
      },
      gps: null,
      flags: {
        ...(params.wrongSite ? { wrongSite: true } : {}),
        ...(params.lateAbsent ? { lateAbsent: true } : {}),
        ...(params.assignmentExpired ? { assignmentExpired: true } : {}),
        ...(params.locationArchived ? { locationArchived: true } : {}),
      },
    };
  }

  private describeExisting(event: TimeGateAttendanceEvent): string {
    const typeLabel =
      event.type === TimeGateAttendanceEventType.CHECK_IN
        ? 'arrivée'
        : event.type === TimeGateAttendanceEventType.CHECK_OUT
          ? 'départ'
          : event.type === TimeGateAttendanceEventType.BREAK_END
            ? 'reprise'
            : 'pointage';
    if (event.status === TimeGateAttendanceEventStatus.REVIEW_REQUIRED) {
      return `Pointage déjà enregistré (${typeLabel}) — en validation`;
    }
    return `Pointage déjà enregistré (${typeLabel})`;
  }

  private describeReviewReason(
    autoReviewReason: string | undefined,
    wrongSite: boolean,
  ): string {
    return (
      punchReviewReasonLabel(autoReviewReason, { wrongSite }) ?? 'Validation requise'
    );
  }
}
