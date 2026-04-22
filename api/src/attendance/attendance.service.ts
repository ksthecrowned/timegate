import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttendanceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private duplicateWindowMs(): number {
    const seconds = Number(this.config.get('DUPLICATE_ATTENDANCE_WINDOW_SECONDS') ?? 300);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;
  }

  async create(dto: CreateAttendanceDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee || !employee.isActive) {
      throw new NotFoundException('Employee not found or inactive');
    }
    const device = await this.prisma.device.findUnique({ where: { id: dto.deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const at = dto.timestamp ? new Date(dto.timestamp) : new Date();

    if (dto.type === AttendanceType.CHECK_IN) {
      const last = await this.prisma.attendance.findFirst({
        where: { employeeId: dto.employeeId },
        orderBy: { timestamp: 'desc' },
      });
      if (last?.type === AttendanceType.CHECK_IN) {
        const delta = at.getTime() - last.timestamp.getTime();
        if (delta >= 0 && delta < this.duplicateWindowMs()) {
          throw new ConflictException('Duplicate check-in within the allowed time window');
        }
      }
    }

    return this.prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        deviceId: dto.deviceId,
        organizationId: device.organizationId,
        type: dto.type,
        confidence: dto.confidence,
        timestamp: at,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        device: { select: { id: true, name: true, siteId: true, site: { select: { id: true, name: true } } } },
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('Invalid date range: from must be before to');
    }
    const where = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.siteId ? { device: { siteId: query.siteId } } : {}),
      ...(query.from || query.to
        ? {
            timestamp: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, siteId: true } },
          device: { select: { id: true, name: true, siteId: true, site: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
