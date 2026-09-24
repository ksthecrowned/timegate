import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';

export type AuditTrailEntry = {
  userId?: string | null;
  companyId: string;
  branchId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  extra?: Record<string, unknown>;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditTrailService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditTrailEntry) {
    const metadata: Record<string, unknown> = {
      ...(entry.before !== undefined ? { before: entry.before } : {}),
      ...(entry.after !== undefined ? { after: entry.after } : {}),
      ...(entry.reason ? { reason: entry.reason } : {}),
      ...(entry.extra ?? {}),
    };

    return this.prisma.timeGateAuditLog.create({
      data: {
        id: generateDocId('AUD'),
        userId: entry.userId ?? null,
        companyId: entry.companyId,
        branchId: entry.branchId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        requestId: entry.requestId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata:
          Object.keys(metadata).length > 0
            ? (metadata as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }
}
