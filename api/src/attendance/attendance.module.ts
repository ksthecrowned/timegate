import { Module } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceDaysService } from './attendance-days.service';
import { AttendanceEventStatusService } from './attendance-event-status.service';
import { AttendanceService } from './attendance.service';
import { PunchCronService } from './punch-cron.service';
import { PunchWindowService } from './punch-window.service';

@Module({
  imports: [HolidaysModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceDaysService,
    AttendanceEventStatusService,
    PunchWindowService,
    PunchCronService,
  ],
  exports: [
    AttendanceService,
    AttendanceDaysService,
    AttendanceEventStatusService,
    PunchWindowService,
  ],
})
export class AttendanceModule {}
