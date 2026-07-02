import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ManagerController } from './manager.controller';
import { ManagerReportService } from './manager-report.service';
import { ManagerService } from './manager.service';

@Module({
  imports: [HolidaysModule, AttendanceModule, AuthModule, NotificationsModule],
  controllers: [ManagerController],
  providers: [ManagerService, ManagerReportService],
})
export class ManagerModule {}
