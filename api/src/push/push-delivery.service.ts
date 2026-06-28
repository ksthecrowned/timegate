import { Injectable, Logger } from '@nestjs/common';
import { TimeGateNotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';
import { FirebaseAdminService, FcmPayload } from './firebase-admin.service';

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
    private readonly expo: ExpoPushService,
  ) {}

  async sendToUsers(
    userIds: string[],
    payload: FcmPayload & { type?: TimeGateNotificationType },
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return;

    const devices = await this.prisma.timeGateDevice.findMany({
      where: { userId: { in: uniqueUserIds }, isActive: true },
    });
    if (devices.length === 0) return;

    const data: Record<string, string> = {
      ...(payload.data ?? {}),
      ...(payload.type ? { type: payload.type } : {}),
    };

    for (const device of devices) {
      try {
        let sent = false;
        if (this.expo.isExpoToken(device.token)) {
          sent = await this.expo.sendToToken(device.token, { ...payload, data });
        } else if (this.firebase.isEnabled()) {
          sent = await this.firebase.sendToToken(device.token, { ...payload, data });
        }

        if (sent) {
          await this.prisma.timeGateDevice.update({
            where: { id: device.id },
            data: { lastSeenAt: new Date() },
          });
        }
      } catch (err) {
        if (this.firebase.isInvalidTokenError(err)) {
          await this.prisma.timeGateDevice.update({
            where: { id: device.id },
            data: { isActive: false },
          });
          this.logger.debug(`Device token revoked: ${device.id}`);
          continue;
        }
        this.logger.warn(
          `Push delivery failed for device ${device.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
