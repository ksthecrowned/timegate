import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsSaasController } from './organizations-saas.controller';
import { OrganizationsSaasService } from './organizations-saas.service';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionQuotaService } from './subscription-quota.service';
import { SubscriptionStateService } from './subscription-state.service';
import { CompanyCapabilitiesService } from './company-capabilities.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    SubscriptionPlansController,
    PlatformSettingsController,
    OrganizationsSaasController,
  ],
  providers: [
    SubscriptionStateService,
    SubscriptionQuotaService,
    SubscriptionPlansService,
    PlatformSettingsService,
    OrganizationsSaasService,
    SubscriptionCronService,
    CompanyCapabilitiesService,
  ],
  exports: [
    SubscriptionStateService,
    SubscriptionQuotaService,
    SubscriptionPlansService,
    CompanyCapabilitiesService,
  ],
})
export class SaasModule {}
