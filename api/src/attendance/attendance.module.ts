import { Module } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceDaysService } from './attendance-days.service';
import { AttendanceEventStatusService } from './attendance-event-status.service';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [HolidaysModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceDaysService, AttendanceEventStatusService],
  exports: [AttendanceService, AttendanceDaysService, AttendanceEventStatusService],
})
export class AttendanceModule {}
