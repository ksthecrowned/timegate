import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { FaceRecognitionLogQueryDto } from './dto/face-recognition-log-query.dto';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';

@Injectable()
export class FaceRecognitionLogsService {
  constructor(private prisma: PrismaService) {}

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
