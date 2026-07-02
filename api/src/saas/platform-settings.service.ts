import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { SubscriptionStateService } from './subscription-state.service';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionState: SubscriptionStateService,
  ) {}

  getSettings() {
    return this.subscriptionState.getPlatformSettings();
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    await this.getSettings();
    return this.prisma.timeGatePlatformSettings.update({
      where: { id: 'PLATFORM' },
      data: {
        ...(dto.trialDays !== undefined ? { trialDays: dto.trialDays } : {}),
        ...(dto.trialMaxEmployees !== undefined
          ? { trialMaxEmployees: dto.trialMaxEmployees }
          : {}),
        ...(dto.trialMaxKiosks !== undefined ? { trialMaxKiosks: dto.trialMaxKiosks } : {}),
        ...(dto.gracePeriodDays !== undefined ? { gracePeriodDays: dto.gracePeriodDays } : {}),
      },
    });
  }
}
