import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeGateShiftSwapStatus, TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { employeeSummarySelect, toEmployeeSummary } from '../common/utils/employee-summary.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';
import { ReviewShiftSwapDto } from './dto/review-shift-swap.dto';
import { ShiftSwapQueryDto } from './dto/shift-swap-query.dto';

@Injectable()
export class ShiftSwapsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftSwapDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    const requester = await this.prisma.employee.findUnique({
      where: { id: dto.requesterEmployeeId },
      select: { id: true, companyId: true },
    });
    if (!requester || requester.companyId !== companyId) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.targetEmployeeId) {
      const target = await this.prisma.employee.findUnique({
        where: { id: dto.targetEmployeeId },
        select: { companyId: true },
      });
      if (!target || target.companyId !== companyId) {
        throw new NotFoundException('Target employee not found');
      }
    }

    if (dto.shiftAssignmentId) {
      const assignment = await this.prisma.shiftAssignment.findUnique({
        where: { id: dto.shiftAssignmentId },
        select: { companyId: true, employeeId: true },
      });
      if (!assignment || assignment.companyId !== companyId) {
        throw new NotFoundException('Shift assignment not found');
      }
      if (assignment.employeeId !== requester.id) {
        throw new BadRequestException('Shift assignment does not belong to requester');
      }
    }

    const created = await this.prisma.timeGateShiftSwapRequest.create({
      data: {
        id: generateDocId('SSWP'),
        companyId,
        requesterEmployeeId: requester.id,
        targetEmployeeId: dto.targetEmployeeId ?? null,
        shiftAssignmentId: dto.shiftAssignmentId ?? null,
        swapDate: this.toDateOnly(dto.swapDate),
        reason: dto.reason?.trim() || null,
        status: TimeGateShiftSwapStatus.PENDING,
      },
      include: this.defaultInclude(),
    });
    return this.toApiShape(created);
  }

  async findAll(query: ShiftSwapQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.TimeGateShiftSwapRequestWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateShiftSwapRequest.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.timeGateShiftSwapRequest.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async review(id: string, dto: ReviewShiftSwapDto, user: JwtUser) {
    const row = await this.prisma.timeGateShiftSwapRequest.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!row) throw new NotFoundException('Shift swap request not found');
    this.assertCompanyAccess(user, row.companyId);
    if (row.status !== TimeGateShiftSwapStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be reviewed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === TimeGateShiftSwapStatus.APPROVED) {
        await this.applyApprovedSwap(tx, row);
      }

      return tx.timeGateShiftSwapRequest.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedByUserId: user.sub,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
        include: this.defaultInclude(),
      });
    });
    return this.toApiShape(updated);
  }

  private async applyApprovedSwap(
    tx: Prisma.TransactionClient,
    row: {
      requesterEmployeeId: string;
      targetEmployeeId: string | null;
      shiftAssignmentId: string | null;
      swapDate: Date;
      companyId: string;
    },
  ) {
    if (!row.targetEmployeeId) {
      throw new BadRequestException('Target employee is required to approve a shift swap');
    }

    let requesterAssignment = row.shiftAssignmentId
      ? await tx.shiftAssignment.findUnique({ where: { id: row.shiftAssignmentId } })
      : null;

    if (!requesterAssignment) {
      requesterAssignment = await this.findEmployeeAssignmentOnDate(
        tx,
        row.requesterEmployeeId,
        row.companyId,
        row.swapDate,
      );
    }

    if (!requesterAssignment || requesterAssignment.companyId !== row.companyId) {
      throw new BadRequestException('No shift assignment found for requester on swap date');
    }
    if (requesterAssignment.employeeId !== row.requesterEmployeeId) {
      throw new BadRequestException('Shift assignment does not belong to requester');
    }

    const targetAssignment = await this.findEmployeeAssignmentOnDate(
      tx,
      row.targetEmployeeId,
      row.companyId,
      row.swapDate,
      requesterAssignment.id,
    );

    if (!targetAssignment) {
      throw new BadRequestException('Target employee has no shift assignment on swap date');
    }

    await tx.shiftAssignment.update({
      where: { id: requesterAssignment.id },
      data: { employeeId: row.targetEmployeeId },
    });
    await tx.shiftAssignment.update({
      where: { id: targetAssignment.id },
      data: { employeeId: row.requesterEmployeeId },
    });
  }

  private async findEmployeeAssignmentOnDate(
    tx: Prisma.TransactionClient,
    employeeId: string,
    companyId: string,
    swapDate: Date,
    excludeId?: string,
  ) {
    const rows = await tx.shiftAssignment.findMany({
      where: {
        companyId,
        employeeId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return rows.find((assignment) => this.coversDate(assignment.startDate, assignment.endDate, swapDate)) ?? null;
  }

  private coversDate(start: Date | null, end: Date | null, day: Date): boolean {
    const d = this.formatDateOnly(day);
    const s = start ? this.formatDateOnly(start) : null;
    const e = end ? this.formatDateOnly(end) : null;
    if (!s && !e) return true;
    if (s && !e) return d >= s;
    if (!s && e) return d <= e;
    return d >= s! && d <= e!;
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private defaultInclude() {
    return {
      requester: { select: employeeSummarySelect },
      target: { select: employeeSummarySelect },
      shiftAssignment: {
        select: {
          id: true,
          shiftType: { select: { id: true, shiftName: true } },
        },
      },
    } satisfies Prisma.TimeGateShiftSwapRequestInclude;
  }

  private toApiShape(
    row: Prisma.TimeGateShiftSwapRequestGetPayload<{ include: ReturnType<ShiftSwapsService['defaultInclude']> }>,
  ) {
    return {
      id: row.id,
      companyId: row.companyId,
      swapDate: row.swapDate.toISOString().slice(0, 10),
      reason: row.reason,
      status: row.status,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt,
      requester: toEmployeeSummary(row.requester),
      target: row.target ? toEmployeeSummary(row.target) : null,
      shiftAssignment: row.shiftAssignment
        ? {
            id: row.shiftAssignment.id,
            shiftTypeName: row.shiftAssignment.shiftType.shiftName,
          }
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDateOnly(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private requireCompanyId(user: JwtUser): string {
    if (!user.companyId) throw new BadRequestException('companyId is required');
    return user.companyId;
  }

  private resolveCompanyFilter(user: JwtUser): string | null {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return null;
    return user.companyId ?? null;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }
}
