import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, Prisma, TimeGateUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SyncRecordsDto } from '../common/dto/sync-records.dto';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { PunchWindowService } from '../attendance/punch-window.service';

type AbsenceRow = Prisma.TimeGateAbsenceRecordGetPayload<{
  include: {
    employee: { select: typeof employeeSummarySelect };
  };
}>;

@Injectable()
export class AbsencesService {
  constructor(
    private prisma: PrismaService,
    private punchWindows: PunchWindowService,
  ) {}

  async create(dto: CreateAbsenceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.companyId) {
      throw new BadRequestException('Employee is not linked to a company');
    }

    const recordDate = this.toDateOnly(dto.date);
    const windows = await this.punchWindows.resolveForEmployee(dto.employeeId, recordDate);
    if (!windows) {
      throw new BadRequestException(
        "Impossible de créer une absence : ce jour n'est pas prévu dans le planning de l'employé (affectation, horaire ou défaut entreprise).",
      );
    }

    try {
      const created = await this.prisma.timeGateAbsenceRecord.create({
        data: {
          id: generateDocId('ABS'),
          companyId: employee.companyId,
          employeeId: dto.employeeId,
          recordDate,
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
        throw new ConflictException('Absence already exists for this employee/date');
      }
      throw e;
    }
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TimeGateAbsenceRecordWhereInput = {
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
      this.prisma.timeGateAbsenceRecord.findMany({
        where,
        orderBy: { recordDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: employeeSummarySelect },
        },
      }),
      this.prisma.timeGateAbsenceRecord.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateAbsenceRecord.findUnique({
      where: { id },
      include: {
        employee: { select: employeeSummarySelect },
      },
    });
    if (!row) throw new NotFoundException('Absence not found');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateAbsenceDto, user: JwtUser) {
    const existing = await this.prisma.timeGateAbsenceRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Absence not found');
    this.assertCompanyAccess(user, existing.companyId);

    const updated = await this.prisma.timeGateAbsenceRecord.update({
      where: { id },
      data: {
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(dto.date ? { recordDate: this.toDateOnly(dto.date) } : {}),
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
    const existing = await this.prisma.timeGateAbsenceRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Absence not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.timeGateAbsenceRecord.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Sync absence records from daily attendance (status ABSENT). */
  async syncFromAttendance(dto: SyncRecordsDto, user: JwtUser) {
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
    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        status: AttendanceStatus.ABSENT,
        attendanceDate: { gte: from, lte: to },
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        companyId: true,
        attendanceDate: true,
      },
    });

    let created = 0;
    let updated = 0;

    for (const row of attendances) {
      const existing = await this.prisma.timeGateAbsenceRecord.findUnique({
        where: {
          employeeId_recordDate: {
            employeeId: row.employeeId,
            recordDate: row.attendanceDate,
          },
        },
      });

      if (existing) {
        await this.prisma.timeGateAbsenceRecord.update({
          where: { id: existing.id },
          data: { attendanceId: row.id },
        });
        updated += 1;
      } else {
        await this.prisma.timeGateAbsenceRecord.create({
          data: {
            id: generateDocId('ABS'),
            companyId: row.companyId!,
            employeeId: row.employeeId,
            recordDate: row.attendanceDate,
            attendanceId: row.id,
            justified: false,
          },
        });
        created += 1;
      }
    }

    return { processed: attendances.length, created, updated, source: 'attendance' };
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

  private toApiShape(row: AbsenceRow) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      date: row.recordDate.toISOString(),
      justified: row.justified,
      reason: row.reason,
      justificationFileUrl: row.justificationFileUrl,
      createdAt: row.createdAt.toISOString(),
      employee: toEmployeeSummary(row.employee) ?? undefined,
    };
  }
}
