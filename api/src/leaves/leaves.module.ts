import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeavesController } from './leaves.controller';
import { LeaveBalancesService } from './leave-balances.service';
import { LeavesService } from './leaves.service';

@Module({
  imports: [AttendanceModule, NotificationsModule],
  controllers: [LeavesController],
  providers: [LeavesService, LeaveBalancesService],
  exports: [LeavesService, LeaveBalancesService],
})
export class LeavesModule {}
