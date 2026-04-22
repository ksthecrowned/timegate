import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceQueryDto } from './dto/device-query.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDeviceDto) {
    await this.ensureSite(dto.siteId);
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return this.prisma.device.create({
      data: {
        name: dto.name,
        siteId: dto.siteId,
        location: dto.location,
        status: DeviceStatus.OFFLINE,
        organizationId: site.organizationId,
        apiKey: randomBytes(24).toString('hex'),
      },
    });
  }

  async findAll(query: DeviceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.status ? { status: query.status } : {}),
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
      this.prisma.device.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { site: { select: { id: true, name: true } } },
      }),
      this.prisma.device.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { site: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.findOne(id);
    if (dto.siteId) {
      await this.ensureSite(dto.siteId);
    }
    return this.prisma.device.update({ where: { id }, data: dto });
  }

  async heartbeat(id: string, dto: DeviceHeartbeatDto) {
    await this.findOne(id);
    return this.prisma.device.update({
      where: { id },
      data: {
        lastSeenAt: new Date(),
        ...(dto.status ? { status: dto.status } : { status: DeviceStatus.ONLINE }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.device.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async ensureSite(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
  }
}
