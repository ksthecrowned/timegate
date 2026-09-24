import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SaasModule } from '../saas/saas.module';
import { ManagerController } from './manager.controller';
import { ManagerReportService } from './manager-report.service';
import { ManagerScopeService } from './manager-scope.service';
import { ManagerService } from './manager.service';

@Module({
  imports: [HolidaysModule, AttendanceModule, AuthModule, NotificationsModule, SaasModule],
  controllers: [ManagerController],
  providers: [ManagerService, ManagerReportService, ManagerScopeService],
  exports: [ManagerService, ManagerReportService, ManagerScopeService],
})
export class ManagerModule {}
