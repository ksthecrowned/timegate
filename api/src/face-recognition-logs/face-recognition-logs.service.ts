import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { FaceRecognitionLogQueryDto } from './dto/face-recognition-log-query.dto';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { generateDocId } from '../common/utils/doc-id.util';

@Injectable()
export class FaceRecognitionLogsService {
  private readonly logger = new Logger(FaceRecognitionLogsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly storage: CloudflareR2Service,
  ) {}

  async findAll(query: FaceRecognitionLogQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const branchId = query.resolvedBranchId();
    const where = {
      ...(companyId ? { companyId } : {}),
      ...(query.kioskId ? { kioskId: query.kioskId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.offlineSync === true ? { isOfflineSync: true } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.faceRecognitionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
          kiosk: { select: { id: true, kioskName: true, branchId: true } },
          branch: { select: { id: true, branchName: true } },
        },
      }),
      this.prisma.faceRecognitionLog.count({ where }),
    ]);

    return {
      data: items.map((log) => this.toApiShape(log)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOfflineSync(user: JwtUser, query: FaceRecognitionLogQueryDto) {
    query.offlineSync = true;
    return this.findAll(query, user.companyId ?? undefined);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredPhotos() {
    const settings = await this.prisma.timeGateSystemSettings.findMany({
      select: { companyId: true, faceLogPhotoRetentionDays: true },
    });
    if (!settings.length) return;

    let totalPurged = 0;
    for (const setting of settings) {
      const retentionDays = Math.max(0, setting.faceLogPhotoRetentionDays ?? 30);
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const rows = await this.prisma.faceRecognitionLog.findMany({
        where: {
          companyId: setting.companyId,
          photo: { not: null },
          createdAt: { lte: cutoff },
        },
        take: 500,
        orderBy: { createdAt: 'asc' },
        select: { id: true, photo: true },
      });
      if (!rows.length) continue;

      for (const row of rows) {
        if (row.photo) {
          await this.storage.deleteByPublicUrl(row.photo);
        }
      }
      await this.prisma.faceRecognitionLog.updateMany({
        where: { id: { in: rows.map((row) => row.id) } },
        data: { photo: null },
      });

      totalPurged += rows.length;
      await this.prisma.timeGateAuditLog.create({
        data: {
          id: generateDocId('AUD'),
          userId: null,
          companyId: setting.companyId,
          action: 'FACE_LOG_PHOTO_PURGED',
          entity: 'FaceRecognitionLog',
          entityId: rows[rows.length - 1]?.id ?? 'batch',
        },
      });
    }

    if (totalPurged > 0) {
      this.logger.log(`Purged ${totalPurged} expired face recognition photo(s).`);
    }
  }

  private toApiShape(log: {
    id: string;
    kioskId: string;
    branchId: string | null;
    companyId: string | null;
    employeeId: string | null;
    success: boolean;
    confidence: { toNumber(): number } | null;
    photo: string | null;
    isOfflineSync: boolean;
    capturedAt: Date | null;
    createdAt: Date;
    employee: { id: string; firstName: string | null; lastName: string | null; employeeName: string; faceEnrollmentPhoto?: string | null } | null;
    kiosk: { id: string; kioskName: string; branchId: string };
    branch: { id: string; branchName: string } | null;
  }) {
    const confidence =
      log.confidence === null || log.confidence === undefined
        ? null
        : typeof log.confidence === 'object' && 'toNumber' in log.confidence
          ? log.confidence.toNumber()
          : Number(log.confidence);

    return {
      id: log.id,
      kioskId: log.kioskId,
      branchId: log.branchId,
      companyId: log.companyId,
      employeeId: log.employeeId,
      success: log.success,
      confidence,
      imageUrl: log.photo,
      offlineSync: log.isOfflineSync,
      capturedAt: log.capturedAt,
      createdAt: log.createdAt,
      employee: toEmployeeSummary(log.employee),
      kiosk: {
        id: log.kiosk.id,
        name: log.kiosk.kioskName,
        branchId: log.kiosk.branchId,
        branch: log.branch ? { id: log.branch.id, name: log.branch.branchName } : null,
      },
    };
  }
}
