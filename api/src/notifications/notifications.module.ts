import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { PushModule } from '../push/push.module';
import { NotificationsController } from './notifications.controller';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PushModule, DevicesModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRecipientResolver],
  exports: [NotificationsService],
})
export class NotificationsModule {}
