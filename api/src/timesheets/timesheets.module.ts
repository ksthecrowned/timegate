import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetsService } from './timesheets.service';

@Module({
  imports: [HolidaysModule, AttendanceModule, NotificationsModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
