import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateRecognitionLogDto } from './dto/create-recognition-log.dto';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecognitionLogDto) {
    const device = await this.prisma.device.findUnique({ where: { id: dto.deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (dto.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
    }
    return this.prisma.recognitionLog.create({
      data: {
        employeeId: dto.employeeId,
        deviceId: dto.deviceId,
        organizationId: device.organizationId,
        success: dto.success,
        confidence: dto.confidence,
        imageUrl: dto.imageUrl,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
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
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.recognitionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          device: { select: { id: true, name: true, siteId: true, site: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.recognitionLog.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
