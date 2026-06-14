import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SyncRecordsDto } from '../common/dto/sync-records.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { CreateLateRecordDto } from './dto/create-late-record.dto';
import { UpdateLateRecordDto } from './dto/update-late-record.dto';
import { TimeGateUserRole } from '@prisma/client';

type LateRow = Prisma.TimeGateLateRecordGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
  };
}>;

@Injectable()
export class LateRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLateRecordDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.companyId) {
      throw new BadRequestException('Employee is not linked to a company');
    }

    const recordAt = new Date(dto.date);
    const recordDate = this.toDateOnly(dto.date);

    try {
      const created = await this.prisma.timeGateLateRecord.create({
        data: {
          id: generateDocId('LATE'),
          companyId: employee.companyId,
          employeeId: dto.employeeId,
          recordDate,
          recordAt,
          latenessMinutes: dto.latenessMinutes,
          justified: dto.justified ?? false,
          reason: dto.reason?.trim() || null,
          justificationFileUrl: dto.justificationFileUrl?.trim() || null,
        },
        include: {
          employee: { select: employeeSummarySelect },
        },
      });
      return this.toApiShape(created);
    } catch (e) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('Late record already exists for this employee/date');
      }
      throw e;
    }
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TimeGateLateRecordWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.from || query.to
        ? {
            recordDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateLateRecord.findMany({
        where,
        orderBy: { recordAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
        },
      }),
      this.prisma.timeGateLateRecord.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateLateRecord.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });
    if (!row) throw new NotFoundException('Late record not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateLateRecordDto, user: JwtUser) {
    const existing = await this.prisma.timeGateLateRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Late record not found');
    this.assertCompanyAccess(user, existing.companyId);

    const updated = await this.prisma.timeGateLateRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.date
          ? {
              recordAt: new Date(dto.date),
              recordDate: this.toDateOnly(dto.date),
            }
          : {}),
        ...(dto.latenessMinutes !== undefined
          ? { latenessMinutes: dto.latenessMinutes }
          : {}),
        ...(typeof dto.justified === 'boolean' ? { justified: dto.justified } : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason?.trim() || null } : {}),
        ...(dto.justificationFileUrl !== undefined
          ? { justificationFileUrl: dto.justificationFileUrl?.trim() || null }
          : {}),
      },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });

    return this.toApiShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.timeGateLateRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Late record not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.timeGateLateRecord.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Sync late records from computed timesheet days (lateMinutes > 0). */
  async syncFromTimesheets(dto: SyncRecordsDto, user: JwtUser) {
    const from = this.toDateOnly(dto.from);
    const to = this.toDateOnly(dto.to);
    if (from > to) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }

    const companyId =
      this.resolveCompanyFilter(user) ?? dto.companyId?.trim() ?? undefined;
    if (!companyId) {
      throw new BadRequestException('companyId is required for this operation');
    }

    const branchId = dto.branchId;
    const days = await this.prisma.timeGateTimesheetDay.findMany({
      where: {
        companyId,
        workDate: { gte: from, lte: to },
        lateMinutes: { gt: 0 },
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        companyId: true,
        workDate: true,
        lateMinutes: true,
      },
    });

    let created = 0;
    let updated = 0;

    for (const day of days) {
      const recordAt = new Date(
        Date.UTC(
          day.workDate.getUTCFullYear(),
          day.workDate.getUTCMonth(),
          day.workDate.getUTCDate(),
          9,
          0,
          0,
        ),
      );

      const existing = await this.prisma.timeGateLateRecord.findUnique({
        where: {
          employeeId_recordDate: {
            employeeId: day.employeeId,
            recordDate: day.workDate,
          },
        },
      });

      if (existing) {
        await this.prisma.timeGateLateRecord.update({
          where: { id: existing.id },
          data: {
            latenessMinutes: day.lateMinutes,
            timesheetDayId: day.id,
            recordAt: existing.justified ? existing.recordAt : recordAt,
          },
        });
        updated += 1;
      } else {
        await this.prisma.timeGateLateRecord.create({
          data: {
            id: generateDocId('LATE'),
            companyId: day.companyId,
            employeeId: day.employeeId,
            recordDate: day.workDate,
            recordAt,
            latenessMinutes: day.lateMinutes,
            timesheetDayId: day.id,
            justified: false,
          },
        });
        created += 1;
      }
    }

    return { processed: days.length, created, updated, source: 'timesheets' };
  }

  private resolveCompanyFilter(user?: JwtUser): string | undefined {
    if (!user) return undefined;
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }

  private toDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private toApiShape(row: LateRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      attendanceId: row.attendanceId,
      date: row.recordAt.toISOString(),
      latenessMinutes: row.latenessMinutes,
      justified: row.justified,
      reason: row.reason,
      justificationFileUrl: row.justificationFileUrl,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
