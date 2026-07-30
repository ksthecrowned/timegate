import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  TimeGateAttendanceAuthMethod,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
} from '@prisma/client';
import { createHash } from 'crypto';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import {
  KIOSK_QR_SLOT_MS,
  parseKioskQrChallengePayload,
  verifyKioskQrChallengePayload,
} from '../common/utils/kiosk-qr-challenge.util';
import {
  resolveOrgTimeZone,
} from '../common/utils/punch-time.util';
import { PrismaService } from '../prisma/prisma.service';
import { AttendancePunchRecorderService } from './attendance-punch-recorder.service';
import { resolveAttendancePunch } from './attendance-punch-resolver';
import {
  buildDayPunchStateFromEvents,
  PunchWindowService,
} from './punch-window.service';
import { PunchAttemptLogService } from './punch-attempt-log.service';

export type QrRedeemResult = {
  ok: true;
  message: string;
  eventType: string;
  occurredAt?: string;
  kiosk?: { id: string; name: string; branchName: string | null };
  employee: { id: string; firstName: string; lastName: string };
  challengeId: string;
};

export type QrSyncItemResult =
  | { clientId: string; ok: true; message: string; eventType?: string }
  | { clientId: string; ok: false; errorCode: string; message: string };

@Injectable()
export class KioskQrPunchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly punchWindows: PunchWindowService,
    private readonly punchRecorder: AttendancePunchRecorderService,
    private readonly punchAttemptLog: PunchAttemptLogService,
  ) {}

  async scan(user: JwtUser, payload: string): Promise<QrRedeemResult> {
    return this.redeem(user, {
      payload,
      scannedAt: new Date(),
      offlineSync: false,
    });
  }

  async sync(
    user: JwtUser,
    items: Array<{ clientId: string; payload: string; scannedAt: string }>,
  ): Promise<{ results: QrSyncItemResult[] }> {
    const results: QrSyncItemResult[] = [];
    for (const item of items) {
      try {
        const scannedAt = new Date(item.scannedAt);
        if (Number.isNaN(scannedAt.getTime())) {
          results.push({
            clientId: item.clientId,
            ok: false,
            errorCode: 'INVALID_SCANNED_AT',
            message: 'scannedAt invalide',
          });
          continue;
        }
        const redeemed = await this.redeem(user, {
          payload: item.payload,
          scannedAt,
          clientId: item.clientId,
          offlineSync: true,
        });
        results.push({
          clientId: item.clientId,
          ok: true,
          message: redeemed.message,
          eventType: redeemed.eventType,
        });
      } catch (err) {
        const errorCode =
          err instanceof ConflictException
            ? 'ALREADY_USED'
            : err instanceof UnauthorizedException || err instanceof ForbiddenException
              ? 'FORBIDDEN'
              : err instanceof BadRequestException
                ? 'INVALID_OR_EXPIRED'
                : 'ERROR';
        results.push({
          clientId: item.clientId,
          ok: false,
          errorCode,
          message: err instanceof Error ? err.message : 'Erreur sync QR',
        });
      }
    }
    return { results };
  }

  private async redeem(
    user: JwtUser,
    params: {
      payload: string;
      scannedAt: Date;
      clientId?: string;
      offlineSync: boolean;
    },
  ): Promise<QrRedeemResult> {
    if (user.deviceTrust && user.deviceTrust !== 'TRUSTED') {
      throw new ForbiddenException('Appareil non approuve pour le pointage QR');
    }
    const employeeId = user.employeeId;
    if (!employeeId || !user.companyId) {
      throw new ForbiddenException('Profil employe requis');
    }

    const parsed = parseKioskQrChallengePayload(params.payload);
    if (!parsed) {
      throw new BadRequestException('QR code invalide');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: user.companyId,
        status: EmployeeStatus.ACTIVE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        branchId: true,
        companyId: true,
      },
    });
    if (!employee?.branchId || !employee.companyId) {
      throw new NotFoundException('Employe introuvable ou sans site');
    }
    const employeeBranchId = employee.branchId;
    const employeeCompanyId = employee.companyId;

    const kiosk = await this.prisma.timeGateKiosk.findFirst({
      where: {
        id: parsed.kioskId,
        companyId: employeeCompanyId,
        isActive: true,
      },
      select: {
        id: true,
        kioskName: true,
        companyId: true,
        branchId: true,
        qrEnabled: true,
        qrChallengeSecret: true,
        branch: { select: { id: true, branchName: true } },
      },
    });
    if (!kiosk?.qrEnabled) {
      throw new ForbiddenException('Pointage QR desactive sur cette borne');
    }
    if (!kiosk.qrChallengeSecret) {
      throw new BadRequestException('Secret QR borne manquant');
    }

    const macOk = verifyKioskQrChallengePayload(
      parsed,
      kiosk.qrChallengeSecret,
      params.scannedAt,
    );
    if (!macOk) {
      throw new UnauthorizedException('QR code expire ou invalide');
    }

    if (params.offlineSync) {
      await this.assertOfflineAge(employeeCompanyId, params.scannedAt);
    }

    if (params.clientId) {
      const byClient = await this.prisma.timeGateQrChallenge.findUnique({
        where: { clientId: params.clientId },
      });
      if (byClient?.redeemedAt) {
        const result = byClient.resultJson as { message?: string; eventType?: string } | null;
        return {
          ok: true as const,
          message: result?.message ?? 'Pointage deja synchronise',
          eventType: result?.eventType ?? 'UNKNOWN',
          occurredAt:
            (result as { occurredAt?: string } | null)?.occurredAt ??
            byClient.redeemedAt?.toISOString(),
          kiosk: (result as { kiosk?: { id: string; name: string; branchName: string | null } } | null)
            ?.kiosk,
          employee: {
            id: employee.id,
            firstName: employee.firstName ?? employee.employeeName,
            lastName: employee.lastName ?? '',
          },
          challengeId: byClient.id,
        };
      }
    }

    let challenge = await this.prisma.timeGateQrChallenge.findUnique({
      where: {
        kioskId_nonce: { kioskId: kiosk.id, nonce: parsed.nonce },
      },
    });

    if (challenge?.redeemedAt) {
      throw new ConflictException('QR code deja utilise');
    }

    const payloadHash = createHash('sha256').update(params.payload.trim()).digest('hex');
    const expiresAt = new Date((parsed.slot + 1) * KIOSK_QR_SLOT_MS);

    if (!challenge) {
      // Offline-generated challenge: create on first redeem when MAC is valid.
      try {
        challenge = await this.prisma.timeGateQrChallenge.create({
          data: {
            id: generateDocId('QRC'),
            kioskId: kiosk.id,
            nonce: parsed.nonce,
            slot: parsed.slot,
            payloadHash,
            expiresAt,
            clientId: params.clientId,
          },
        });
      } catch (err) {
        // Concurrent create on same nonce — reload winner.
        const existing = await this.prisma.timeGateQrChallenge.findUnique({
          where: {
            kioskId_nonce: { kioskId: kiosk.id, nonce: parsed.nonce },
          },
        });
        if (!existing) throw err;
        challenge = existing;
        if (challenge.redeemedAt) {
          throw new ConflictException('QR code deja utilise');
        }
      }
    } else if (params.clientId && !challenge.clientId) {
      await this.prisma.timeGateQrChallenge.update({
        where: { id: challenge.id },
        data: { clientId: params.clientId },
      });
    }

    if (params.scannedAt.getTime() > challenge.expiresAt.getTime()) {
      throw new BadRequestException('QR code expire');
    }

    // Claim atomically before recording attendance to avoid double-punch races.
    const claimed = await this.prisma.timeGateQrChallenge.updateMany({
      where: { id: challenge.id, redeemedAt: null },
      data: {
        redeemedAt: new Date(),
        employeeId: employee.id,
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
    });
    if (claimed.count === 0) {
      throw new ConflictException('QR code deja utilise');
    }

    const occurredAt = params.scannedAt;
    let punch: { message: string; eventType: string };
    try {
      punch = await this.recordPunchFromQr({
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeName: employee.employeeName,
          branchId: employeeBranchId,
          companyId: employeeCompanyId,
        },
        kiosk,
        occurredAt,
        offlineSync: params.offlineSync,
        verificationRef: challenge.id,
      });
    } catch (err) {
      // Release claim so a transient window rejection can be retried.
      await this.prisma.timeGateQrChallenge.updateMany({
        where: { id: challenge.id, employeeId: employee.id },
        data: { redeemedAt: null, employeeId: null },
      });
      throw err;
    }

    const resultJson = {
      message: punch.message,
      eventType: punch.eventType,
      occurredAt: occurredAt.toISOString(),
      kiosk: {
        id: kiosk.id,
        name: kiosk.kioskName,
        branchName: kiosk.branch?.branchName ?? null,
      },
      employee: {
        id: employee.id,
        firstName: employee.firstName ?? employee.employeeName,
        lastName: employee.lastName ?? '',
      },
    };

    await this.prisma.timeGateQrChallenge.update({
      where: { id: challenge.id },
      data: {
        resultJson,
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
    });

    return {
      ok: true as const,
      message: punch.message,
      eventType: punch.eventType,
      occurredAt: occurredAt.toISOString(),
      kiosk: resultJson.kiosk,
      employee: resultJson.employee,
      challengeId: challenge.id,
    };
  }

  private async assertOfflineAge(companyId: string, scannedAt: Date) {
    const settings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      select: { allowOfflineSync: true, offlineSyncMaxAgeMinutes: true },
    });
    if (settings?.allowOfflineSync === false) {
      throw new BadRequestException('Synchronisation offline desactivee');
    }
    const maxAgeMinutes = settings?.offlineSyncMaxAgeMinutes ?? 720;
    const ageMs = Date.now() - scannedAt.getTime();
    if (ageMs < 0) {
      throw new BadRequestException('scannedAt invalide (futur)');
    }
    if (ageMs > maxAgeMinutes * 60_000) {
      throw new BadRequestException('QR offline trop ancien');
    }
  }

  private async recordPunchFromQr(params: {
    employee: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      employeeName: string;
      branchId: string;
      companyId: string;
    };
    kiosk: { id: string; companyId: string; branchId: string };
    occurredAt: Date;
    offlineSync: boolean;
    verificationRef: string;
  }): Promise<{ message: string; eventType: string }> {
    const source = params.offlineSync
      ? TimeGateAttendanceEventSource.KIOSK_OFFLINE_SYNC
      : TimeGateAttendanceEventSource.EMPLOYEE_APP;
    const company = await this.prisma.company.findUnique({
      where: { id: params.kiosk.companyId },
      select: { timeZone: true },
    });
    const timeZone = resolveOrgTimeZone(company?.timeZone);
    const punchCtx = await this.punchWindows.resolvePunchContext(
      params.employee.id,
      params.occurredAt,
      timeZone,
    );
    const windows = punchCtx.windows;
    if (!windows) {
      throw new BadRequestException('Horaires de pointage non configures');
    }

    const todaysEvents = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        employeeId: params.employee.id,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        occurredAt: { gte: punchCtx.bounds.start, lte: punchCtx.bounds.end },
      },
      orderBy: { occurredAt: 'asc' },
      select: { type: true, occurredAt: true },
    });
    const state = buildDayPunchStateFromEvents(todaysEvents, timeZone);
    const resolution = resolveAttendancePunch(punchCtx.atMin, windows, state);

    if (resolution.action === 'REJECTED' || resolution.action === 'NONE') {
      await this.punchAttemptLog.logAttempt({
        companyId: params.kiosk.companyId,
        employeeId: params.employee.id,
        branchId: params.kiosk.branchId,
        kioskId: params.kiosk.id,
        source,
        authMethod: TimeGateAttendanceAuthMethod.QR,
        outcome: 'REJECTED',
        message: resolution.message,
        occurredAt: params.occurredAt,
      });
      throw new BadRequestException(resolution.message);
    }

    const wrongSite = params.employee.branchId !== params.kiosk.branchId;
    const eventType =
      resolution.action === 'CHECK_IN'
        ? TimeGateAttendanceEventType.CHECK_IN
        : resolution.action === 'BREAK_END'
          ? TimeGateAttendanceEventType.BREAK_END
          : TimeGateAttendanceEventType.CHECK_OUT;

    const { message } = await this.punchRecorder.recordEvent({
      employeeId: params.employee.id,
      kioskId: params.kiosk.id,
      branchId: params.kiosk.branchId,
      companyId: params.kiosk.companyId,
      confidence: 1,
      verificationRef: params.verificationRef,
      source,
      occurredAt: params.occurredAt,
      eventType,
      employeeBranchId: params.employee.branchId,
      wrongSite,
      lateAbsent: resolution.action === 'CHECK_IN' ? resolution.lateAbsent : undefined,
      idempotencySuffix: `qr_${resolution.action.toLowerCase()}`,
      authMethod: TimeGateAttendanceAuthMethod.QR,
    });

    return { message, eventType };
  }
}
