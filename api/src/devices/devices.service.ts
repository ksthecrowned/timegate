import { Injectable } from '@nestjs/common';
import { TimeGateDevicePlatform } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(user: JwtUser, token: string, platform: TimeGateDevicePlatform) {
    const existing = await this.prisma.timeGateDevice.findUnique({
      where: { token },
    });

    if (existing) {
      const updated = await this.prisma.timeGateDevice.update({
        where: { token },
        data: {
          userId: user.sub,
          platform,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
      return this.toApiShape(updated);
    }

    const created = await this.prisma.timeGateDevice.create({
      data: {
        id: generateDocId('DEV'),
        userId: user.sub,
        token,
        platform,
        isActive: true,
      },
    });
    return this.toApiShape(created);
  }

  async remove(user: JwtUser, token: string) {
    await this.prisma.timeGateDevice.updateMany({
      where: { token, userId: user.sub },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async listMine(user: JwtUser) {
    const devices = await this.prisma.timeGateDevice.findMany({
      where: { userId: user.sub, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    return devices.map((device) => this.toApiShape(device));
  }

  private toApiShape(device: {
    id: string;
    platform: TimeGateDevicePlatform;
    isActive: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }) {
    return {
      id: device.id,
      platform: device.platform,
      isActive: device.isActive,
      lastSeenAt: device.lastSeenAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
    };
  }
}
