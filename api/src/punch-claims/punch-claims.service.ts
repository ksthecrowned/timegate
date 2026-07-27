import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TimeGatePunchClaimStatus,
  TimeGatePunchClaimType,
  TimeGateTimesheetDayStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import {
  CreatePunchClaimDto,
  FindPunchClaimsQueryDto,
  ReviewPunchClaimDto,
} from './dto/punch-claim.dto';

@Injectable()
export class PunchClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindPunchClaimsQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGatePunchClaimWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            workDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGatePunchClaim.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
          timesheetDay: { select: { id: true, status: true, workDate: true } },
        },
      }),
      this.prisma.timeGatePunchClaim.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGatePunchClaim.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
        timesheetDay: true,
        reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('Punch claim not found');
    this.assertCompanyAccess(user, row.companyId);
    if (user.role === TimeGateUserRole.EMPLOYEE && user.employeeId !== row.employeeId) {
      throw new ForbiddenException('Access denied');
    }
    return this.toApiShape(row);
  }

  async createForEmployee(user: JwtUser, dto: CreatePunchClaimDto) {
    const employeeId = user.employeeId;
    if (!employeeId) throw new ForbiddenException('No employee profile linked');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee?.companyId) throw new NotFoundException('Employee not found');

    const workDate = this.toDateOnly(dto.workDate);
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('reason is required');

    const timesheetDay = await this.prisma.timeGateTimesheetDay.findUnique({
      where: {
        employeeId_workDate: { employeeId, workDate },
      },
    });

    const created = await this.prisma.timeGatePunchClaim.create({
      data: {
        id: generateDocId('PCL'),
        companyId: employee.companyId,
        employeeId,
        workDate,
        type: dto.type,
        reason,
        status: TimeGatePunchClaimStatus.OPEN,
        timesheetDayId: timesheetDay?.id ?? null,
      },
      include: {
        employee: { select: employeeSummarySelect },
        timesheetDay: { select: { id: true, status: true, workDate: true } },
      },
    });

    if (
      timesheetDay &&
      (dto.type === TimeGatePunchClaimType.MISSED_CHECKOUT ||
        dto.type === TimeGatePunchClaimType.EARLY_DEPARTURE)
    ) {
      await this.prisma.timeGateTimesheetDay.update({
        where: { id: timesheetDay.id },
        data: { status: TimeGateTimesheetDayStatus.REVIEW_REQUIRED },
      });
    }

    return this.toApiShape(created);
  }

  async review(id: string, dto: ReviewPunchClaimDto, user: JwtUser) {
    if (user.role === TimeGateUserRole.EMPLOYEE) {
      throw new ForbiddenException('Only managers can review punch claims');
    }

    const row = await this.prisma.timeGatePunchClaim.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Punch claim not found');
    this.assertCompanyAccess(user, row.companyId);

    if (row.status !== TimeGatePunchClaimStatus.OPEN) {
      throw new BadRequestException('Claim already reviewed');
    }

    if (dto.status === 'REJECTED' && !dto.reviewNote?.trim()) {
      throw new BadRequestException('reviewNote is required when rejecting');
    }

    const updated = await this.prisma.timeGatePunchClaim.update({
      where: { id },
      data: {
        status:
          dto.status === 'APPROVED'
            ? TimeGatePunchClaimStatus.APPROVED
            : TimeGatePunchClaimStatus.REJECTED,
        reviewedByUserId: user.sub,
        reviewedAt: new Date(),
        reviewNote: dto.reviewNote?.trim() || null,
      },
      include: {
        employee: { select: employeeSummarySelect },
        timesheetDay: { select: { id: true, status: true, workDate: true } },
        reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return this.toApiShape(updated);
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

  private toDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private toApiShape(row: {
    id: string;
    companyId: string;
    employeeId: string;
    workDate: Date;
    type: TimeGatePunchClaimType;
    reason: string;
    status: TimeGatePunchClaimStatus;
    timesheetDayId: string | null;
    reviewedByUserId: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    employee?: {
      id: string;
      employeeName: string;
      firstName: string | null;
      lastName: string | null;
      faceEnrollmentPhoto: string | null;
    } | null;
    timesheetDay?: { id: string; status: TimeGateTimesheetDayStatus; workDate: Date } | null;
    reviewedBy?: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      workDate: row.workDate.toISOString().slice(0, 10),
      type: row.type,
      reason: row.reason,
      status: row.status,
      timesheetDayId: row.timesheetDayId,
      timesheetDay:
        row.timesheetDay && typeof row.timesheetDay === 'object' && 'workDate' in row.timesheetDay
          ? {
              id: row.timesheetDay.id,
              status: row.timesheetDay.status,
              workDate: row.timesheetDay.workDate.toISOString().slice(0, 10),
            }
          : null,
      reviewedByUserId: row.reviewedByUserId,
      reviewedBy: row.reviewedBy
        ? {
            id: row.reviewedBy.id,
            email: row.reviewedBy.email,
            firstName: row.reviewedBy.firstName,
            lastName: row.reviewedBy.lastName,
          }
        : null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
