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
  idempotencySuffix: string;
  authMethod?: TimeGateAttendanceAuthMethod;
  idempotencyKey?: string;
};

@Injectable()
export class AttendancePunchRecorderService {
  private readonly logger = new Logger(AttendancePunchRecorderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventStatus: AttendanceEventStatusService,
    private readonly notifications: NotificationsService,
  ) {}

  async recordEvent(params: RecordPunchEventParams): Promise<{ message: string; event: TimeGateAttendanceEvent }> {
    let { status, autoReviewReason } = await this.eventStatus.resolveForCompany(
      params.companyId,
      params.confidence,
    );

    if (params.wrongSite) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'KIOSK_OTHER_SITE';
    } else if (params.lateAbsent) {
      status = TimeGateAttendanceEventStatus.REVIEW_REQUIRED;
      autoReviewReason = 'LATE_CHECKIN';
    }

    const pendingMeta = this.eventStatus.buildPendingMeta({ status, autoReviewReason });
    const meta =
      pendingMeta ??
      (params.lateAbsent ? ({ lateAbsent: true } as object) : undefined);

    const idempotencyKey =
      params.idempotencyKey ??
      (params.verificationRef
        ? `verify:${params.verificationRef}:attendance:${params.idempotencySuffix}`
        : undefined);

    const event = await this.prisma.timeGateAttendanceEvent.create({
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
        meta: meta as Prisma.InputJsonValue | undefined,
      },
    });

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
        reviewReason: this.describeReviewReason(autoReviewReason, params.wrongSite),
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

    if (status === TimeGateAttendanceEventStatus.ACCEPTED) {
      await this.eventStatus.materializeAcceptedEvent(event);
      return { message: defaultMessage, event };
    }

    return {
      message: `${defaultMessage} En attente de validation manager.`,
      event,
    };
  }

  private describeReviewReason(
    autoReviewReason: string | undefined,
    wrongSite: boolean,
  ): string {
    if (wrongSite || autoReviewReason === 'KIOSK_OTHER_SITE') {
      return 'Pointage sur un autre site';
    }
    if (autoReviewReason === 'LATE_CHECKIN') {
      return 'Arrivée en retard';
    }
    if (autoReviewReason === 'LOW_CONFIDENCE') {
      return 'Confiance faciale insuffisante';
    }
    return 'Validation requise';
  }
}
