import { Module } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceDaysService } from './attendance-days.service';
import { AttendanceEventStatusService } from './attendance-event-status.service';
import { AttendancePunchRecorderService } from './attendance-punch-recorder.service';
import { AttendanceService } from './attendance.service';
import { EmployeeBreakPunchService } from './employee-break-punch.service';
import { KioskQrPunchService } from './kiosk-qr-punch.service';
import { PunchAttemptLogService } from './punch-attempt-log.service';
import { PunchCronService } from './punch-cron.service';
import { DemoAttendanceSeedCronService } from './demo-attendance-seed-cron.service';
import { PunchWindowService } from './punch-window.service';

@Module({
  imports: [HolidaysModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceDaysService,
    AttendanceEventStatusService,
    AttendancePunchRecorderService,
    PunchAttemptLogService,
    EmployeeBreakPunchService,
    KioskQrPunchService,
    PunchWindowService,
    PunchCronService,
    DemoAttendanceSeedCronService,
  ],
  exports: [
    AttendanceService,
    AttendanceDaysService,
    AttendanceEventStatusService,
    AttendancePunchRecorderService,
    PunchAttemptLogService,
    EmployeeBreakPunchService,
    KioskQrPunchService,
    PunchWindowService,
    DemoAttendanceSeedCronService,
  ],
})
export class AttendanceModule {}
