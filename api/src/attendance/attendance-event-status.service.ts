import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckinLogType,
  EmployeeStatus,
  Prisma,
  TimeGateAttendanceEvent,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import {
  AttendanceEventStatusResolution,
  resolveAttendanceEventStatus,
} from '../common/utils/attendance-event-status.util';
import { AttendanceDaysService } from './attendance-days.service';

@Injectable()
export class AttendanceEventStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly attendanceDays: AttendanceDaysService,
  ) {}

  getMatchFloor(): number {
    return Number(this.config.get('FACE_VERIFY_THRESHOLD') ?? 0.82);
  }

  async resolveForCompany(
    companyId: string,
    confidence: number,
  ): Promise<AttendanceEventStatusResolution> {
    const settings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      select: { minConfidence: true },
    });
    const minAccept = settings?.minConfidence ?? 0.75;
    return resolveAttendanceEventStatus(confidence, minAccept, this.getMatchFloor());
  }

  buildPendingMeta(resolution: AttendanceEventStatusResolution): Prisma.InputJsonValue | undefined {
    if (resolution.status !== TimeGateAttendanceEventStatus.REVIEW_REQUIRED) {
      return undefined;
    }
    return {
      pendingCheckin: true,
      ...(resolution.autoReviewReason
        ? { autoReviewReason: resolution.autoReviewReason }
        : {}),
    } as Prisma.InputJsonValue;
  }

  /** Crée le punch legacy + lien log face lorsque l'événement est ACCEPTED (ou après review). */
  async materializeAcceptedEvent(event: TimeGateAttendanceEvent): Promise<string | null> {
    if (!event.employeeId) {
      throw new NotFoundException('Event has no employee');
    }

    let checkinId: string | null = null;

    if (event.verificationRef) {
      const checkinByRef = await this.prisma.employeeCheckin.findUnique({
        where: { id: event.verificationRef },
        select: { id: true },
      });
      if (checkinByRef) {
        checkinId = checkinByRef.id;
      } else {
        const log = await this.prisma.faceRecognitionLog.findUnique({
          where: { id: event.verificationRef },
          select: { employeeCheckinId: true },
        });
        if (log?.employeeCheckinId) {
          checkinId = log.employeeCheckinId;
        }
      }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: event.employeeId },
      select: {
        id: true,
        employeeName: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      throw new NotFoundException('Employee not found or inactive');
    }

    if (!checkinId) {
      const logType =
        event.type === TimeGateAttendanceEventType.CHECK_IN
          ? CheckinLogType.IN
          : CheckinLogType.OUT;
      const employeeName =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.employeeName;

      const checkin = await this.prisma.employeeCheckin.create({
        data: {
          id: generateDocId('CHK'),
          employeeId: event.employeeId,
          employeeName,
          logType,
          time: event.occurredAt,
          deviceId: event.kioskId,
        },
      });
      checkinId = checkin.id;

      if (event.verificationRef) {
        const log = await this.prisma.faceRecognitionLog.findUnique({
          where: { id: event.verificationRef },
          select: { id: true },
        });
        if (log) {
          await this.prisma.faceRecognitionLog.update({
            where: { id: event.verificationRef },
            data: { employeeCheckinId: checkin.id },
          });
        }
      }
    }

    if (event.type === TimeGateAttendanceEventType.CHECK_IN) {
      await this.attendanceDays.markPresentFromCheckin(event.employeeId, event.occurredAt);
    }

    return checkinId;
  }
}
