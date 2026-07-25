import { Module } from '@nestjs/common';
import { EmployeePortalGuard } from '../employee-portal/guards/employee-portal.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeeMessagesController } from './employee-messages.controller';
import { MessagesController } from './messages.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MessagesController, EmployeeMessagesController],
  providers: [MessagingService, EmployeePortalGuard],
  exports: [MessagingService],
})
export class MessagingModule {}
