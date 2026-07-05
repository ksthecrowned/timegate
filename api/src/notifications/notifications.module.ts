import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { PushModule } from '../push/push.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { NotificationEmailService } from './notification-email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PushModule, DevicesModule, WebhooksModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRecipientResolver, NotificationEmailService],
  exports: [NotificationsService, NotificationRecipientResolver],
})
export class NotificationsModule {}
