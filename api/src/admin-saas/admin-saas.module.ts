import { Module } from '@nestjs/common';
import { AdminSaasService } from './admin-saas.service';
import { AuditLogsController } from './audit-logs.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SystemConfigController } from './system-config.controller';
import { PlatformStatsController } from './platform-stats.controller';

@Module({
  controllers: [SystemConfigController, SubscriptionsController, AuditLogsController, PlatformStatsController],
  providers: [AdminSaasService],
})
export class AdminSaasModule {}
