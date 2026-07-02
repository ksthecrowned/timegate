import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TimeGateAttendanceAuthMethod,
  TimeGateAttendanceEventSource,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';

export type LogPunchAttemptParams = {
  companyId: string;
  employeeId?: string;
  branchId?: string;
  kioskId?: string;
  source?: TimeGateAttendanceEventSource;
  authMethod?: TimeGateAttendanceAuthMethod;
  outcome: 'REJECTED';
  message: string;
  occurredAt: Date;
  meta?: Prisma.InputJsonValue;
};

@Injectable()
export class PunchAttemptLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAttempt(params: LogPunchAttemptParams): Promise<void> {
    await this.prisma.timeGatePunchAttemptLog.create({
      data: {
        id: generateDocId('PAL'),
        companyId: params.companyId,
        employeeId: params.employeeId,
        branchId: params.branchId,
        kioskId: params.kioskId,
        source: params.source,
        authMethod: params.authMethod,
        outcome: params.outcome,
        message: params.message,
        occurredAt: params.occurredAt,
        meta: params.meta,
      },
    });
  }
}
