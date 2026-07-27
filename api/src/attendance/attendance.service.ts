import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckinLogType,
  EmployeeStatus,
  Prisma,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateUserRole,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import {
  employeeSummaryWithBranchSelect,
  toEmployeeSummary,
} from '../common/utils/employee-summary.util';
import {
  CreateAttendanceDto,
  LegacyAttendanceType,
  toCheckinLogType,
} from './dto/create-attendance.dto';
import { FindAttendanceEventsQueryDto } from './dto/find-attendance-events-query.dto';
import { ReviewAttendanceEventDto } from './dto/review-attendance-event.dto';
import { AttendanceDaysService } from './attendance-days.service';
import { AttendanceEventStatusService } from './attendance-event-status.service';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private attendanceDays: AttendanceDaysService,
    private eventStatus: AttendanceEventStatusService,
  ) {}

  private duplicateWindowMs(): number {
    const seconds = Number(this.config.get('DUPLICATE_ATTENDANCE_WINDOW_SECONDS') ?? 300);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;
  }

  // ---------------------------------------------------------------------------
  // EmployeeCheckin — route legacy GET/POST /attendance
  // ---------------------------------------------------------------------------

  async createCheckin(dto: CreateAttendanceDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      throw new NotFoundException('Employee not found or inactive');
    }

    const kiosk = await this.prisma.timeGateKiosk.findUnique({ where: { id: dto.kioskId } });
    if (!kiosk) {
      throw new NotFoundException('Kiosk not found');
    }
    if (!employee.branchId) {
      throw new BadRequestException('Employee has no branch assignment');
    }

    const at = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const logType = toCheckinLogType(dto.type);

    if (dto.type === LegacyAttendanceType.CHECK_IN) {
      const last = await this.prisma.employeeCheckin.findFirst({
        where: { employeeId: dto.employeeId },
        orderBy: { time: 'desc' },
      });
      if (last?.logType === CheckinLogType.IN) {
        const delta = at.getTime() - last.time.getTime();
        if (delta >= 0 && delta < this.duplicateWindowMs()) {
          throw new ConflictException('Duplicate check-in within the allowed time window');
        }
      }
    }

    const employeeName =
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.employeeName;

    const { status, autoReviewReason } = await this.eventStatus.resolveForCompany(
      kiosk.companyId,
      dto.confidence,
    );
    const pendingMeta = this.eventStatus.buildPendingMeta({ status, autoReviewReason });

    const checkin = await this.prisma.employeeCheckin.create({
      data: {
        id: generateDocId('CHK'),
        employeeId: dto.employeeId,
        employeeName,
        logType,
        time: at,
        deviceId: kiosk.id,
      },
      include: {
        employee: { select: employeeSummaryWithBranchSelect },
      },
    });

    await this.prisma.timeGateAttendanceEvent.create({
      data: {
        id: generateDocId('AEV'),
        companyId: kiosk.companyId,
        branchId: employee.branchId,
        kioskId: kiosk.id,
        employeeId: employee.id,
        source: TimeGateAttendanceEventSource.MANUAL,
        type:
          logType === CheckinLogType.IN
            ? TimeGateAttendanceEventType.CHECK_IN
            : TimeGateAttendanceEventType.CHECK_OUT,
        status,
        occurredAt: at,
        confidence: dto.confidence,
        verificationRef: checkin.id,
        idempotencyKey: `manual:${checkin.id}`,
        meta: pendingMeta,
      },
    });

    if (status === TimeGateAttendanceEventStatus.ACCEPTED && logType === CheckinLogType.IN) {
      await this.attendanceDays.markPresentFromCheckin(employee.id, at);
    }

    return this.toLegacyCheckinShape(checkin, kiosk);
  }

  async findCheckins(query: PaginationQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const branchId = query.resolvedBranchId();
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.EmployeeCheckinWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(branchId ? { employee: { branchId } } : {}),
      ...(companyId ? { employee: { companyId } } : {}),
      ...(query.from || query.to
        ? {
            time: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.employeeCheckin.findMany({
        where,
        orderBy: { time: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummaryWithBranchSelect },
        },
      }),
      this.prisma.employeeCheckin.count({ where }),
    ]);

    const kioskIds = [...new Set(items.map((i) => i.deviceId).filter(Boolean))] as string[];
    const kiosks = kioskIds.length
      ? await this.prisma.timeGateKiosk.findMany({
          where: { id: { in: kioskIds } },
          include: { branch: { select: { id: true, branchName: true } } },
        })
      : [];
    const kioskById = new Map(kiosks.map((k) => [k.id, k]));

    return {
      data: items.map((item) =>
        this.toLegacyCheckinShape(item, item.deviceId ? kioskById.get(item.deviceId) : undefined),
      ),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // TimeGateAttendanceEvent — /attendance/events
  // ---------------------------------------------------------------------------

  async findEvents(query: FindAttendanceEventsQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const branchId = query.resolvedBranchId();
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGateAttendanceEventWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateAttendanceEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummaryWithBranchSelect },
          kiosk: { select: { id: true, kioskName: true, branchId: true } },
          branch: { select: { id: true, branchName: true } },
        },
      }),
      this.prisma.timeGateAttendanceEvent.count({ where }),
    ]);

    return {
      data: items.map((e) => this.toCanonicalEventShape(e)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findEvent(id: string, user: JwtUser) {
    const event = await this.prisma.timeGateAttendanceEvent.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummaryWithBranchSelect },
        kiosk: { select: { id: true, kioskName: true, branchId: true } },
        branch: { select: { id: true, branchName: true } },
      },
    });
    if (!event) {
      throw new NotFoundException('Attendance event not found');
    }
    this.assertCompanyAccess(user, event.companyId);
    return this.toCanonicalEventShape(event);
  }

  async reviewEvent(eventId: string, dto: ReviewAttendanceEventDto, user: JwtUser) {
    const event = await this.prisma.timeGateAttendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Attendance event not found');
    }

    this.assertCompanyAccess(user, event.companyId);

    if (event.status !== TimeGateAttendanceEventStatus.REVIEW_REQUIRED) {
      throw new BadRequestException('Only events with REVIEW_REQUIRED status can be reviewed');
    }

    if (dto.status === 'REJECTED' && !dto.reason?.trim()) {
      throw new BadRequestException('reason is required when rejecting an event');
    }

    const previousStatus = event.status;
    const reviewedAt = new Date().toISOString();
    const meta = this.mergeMeta(event.meta, {
      reviewedBy: user.sub,
      reviewedAt,
      previousStatus,
      ...(dto.reason ? { reason: dto.reason.trim() } : {}),
    });

    const newStatus =
      dto.status === 'ACCEPTED'
        ? TimeGateAttendanceEventStatus.ACCEPTED
        : TimeGateAttendanceEventStatus.REJECTED;

    const updated = await this.prisma.timeGateAttendanceEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        rejectReason: dto.status === 'REJECTED' ? dto.reason!.trim() : null,
        meta,
      },
      include: {
        employee: { select: employeeSummaryWithBranchSelect },
        kiosk: { select: { id: true, kioskName: true, branchId: true } },
        branch: { select: { id: true, branchName: true } },
      },
    });

    if (newStatus === TimeGateAttendanceEventStatus.ACCEPTED) {
      await this.eventStatus.materializeAcceptedEvent(updated);
    }

    const action =
      dto.status === 'ACCEPTED'
        ? 'ATTENDANCE_EVENT_REVIEW_ACCEPTED'
        : 'ATTENDANCE_EVENT_REVIEW_REJECTED';

    await this.prisma.timeGateAuditLog.create({
      data: {
        id: generateDocId('AUD'),
        userId: user.sub,
        companyId: event.companyId,
        action,
        entity: 'TimeGateAttendanceEvent',
        entityId: eventId,
      },
    });

    return this.toCanonicalEventShape(updated);
  }

  async getEventReviews(eventId: string, user: JwtUser) {
    const event = await this.prisma.timeGateAttendanceEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Attendance event not found');
    }

    this.assertCompanyAccess(user, event.companyId);

    const reviews = await this.prisma.timeGateAuditLog.findMany({
      where: {
        entityId: eventId,
        action: { startsWith: 'ATTENDANCE_EVENT_REVIEW_' },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, timeGateRole: true } },
      },
    });

    return {
      event: {
        id: event.id,
        status: event.status,
        rejectReason: event.rejectReason,
        meta: this.parseMeta(event.meta),
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        userId: r.userId,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        createdAt: r.createdAt,
        user: r.user
          ? { id: r.user.id, email: r.user.email, role: r.user.timeGateRole }
          : null,
      })),
    };
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private mergeMeta(
    current: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const base =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private parseMeta(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private toLegacyCheckinShape(
    checkin: {
      id: string;
      employeeId: string;
      logType: CheckinLogType;
      time: Date;
      deviceId: string | null;
      createdAt: Date;
      employee?: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        branchId: string | null;
      } | null;
    },
    kiosk?: {
      id: string;
      kioskName: string;
      branchId: string;
      companyId?: string;
      branch?: { id: string; branchName: string } | null;
    },
  ) {
    const legacyType =
      checkin.logType === CheckinLogType.IN
        ? LegacyAttendanceType.CHECK_IN
        : LegacyAttendanceType.CHECK_OUT;

    return {
      id: checkin.id,
      employeeId: checkin.employeeId,
      kioskId: checkin.deviceId ?? '',
      type: legacyType,
      timestamp: checkin.time.toISOString(),
      confidence: 1,
      createdAt: checkin.createdAt.toISOString(),
      employee: checkin.employee
        ? {
            id: checkin.employee.id,
            firstName: checkin.employee.firstName ?? '',
            lastName: checkin.employee.lastName ?? '',
            branchId: checkin.employee.branchId,
          }
        : undefined,
      kiosk: kiosk
        ? {
            id: kiosk.id,
            name: kiosk.kioskName,
            branchId: kiosk.branchId,
            branch: kiosk.branch
              ? { id: kiosk.branch.id, name: kiosk.branch.branchName }
              : undefined,
          }
        : undefined,
    };
  }

  private toCanonicalEventShape(event: {
    id: string;
    companyId: string;
    branchId: string;
    kioskId: string;
    employeeId: string | null;
    source: TimeGateAttendanceEventSource;
    type: TimeGateAttendanceEventType;
    status: TimeGateAttendanceEventStatus;
    occurredAt: Date;
    receivedAt: Date;
    confidence: Prisma.Decimal | null;
    verificationRef: string | null;
    idempotencyKey: string | null;
    rejectReason: string | null;
    meta: Prisma.JsonValue | null;
    createdAt: Date;
    employee?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      branchId: string | null;
    } | null;
    kiosk?: { id: string; kioskName: string; branchId: string } | null;
    branch?: { id: string; branchName: string } | null;
  }) {
    const confidence =
      event.confidence === null || event.confidence === undefined
        ? null
        : Number(event.confidence);

    return {
      id: event.id,
      companyId: event.companyId,
      branchId: event.branchId,
      kioskId: event.kioskId,
      employeeId: event.employeeId,
      source: event.source,
      type: event.type,
      status: event.status,
      occurredAt: event.occurredAt.toISOString(),
      receivedAt: event.receivedAt.toISOString(),
      confidence,
      verificationRef: event.verificationRef,
      idempotencyKey: event.idempotencyKey,
      rejectReason: event.rejectReason,
      meta: this.parseMeta(event.meta),
      createdAt: event.createdAt.toISOString(),
      employee: toEmployeeSummary(event.employee, { includeBranchId: true }),
      kiosk: event.kiosk
        ? {
            id: event.kiosk.id,
            name: event.kiosk.kioskName,
            branchId: event.kiosk.branchId,
            branch: event.branch ? { id: event.branch.id, name: event.branch.branchName } : null,
          }
        : null,
      branch: event.branch ? { id: event.branch.id, name: event.branch.branchName } : null,
    };
  }
}
