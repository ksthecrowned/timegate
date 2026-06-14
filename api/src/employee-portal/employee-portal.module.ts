import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeavesModule } from '../leaves/leaves.module';
import { LeaveTypesModule } from '../leave-types/leave-types.module';
import { EmployeePortalController } from './employee-portal.controller';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeePortalGuard } from './guards/employee-portal.guard';

@Module({
  imports: [AttendanceModule, LeavesModule, LeaveTypesModule],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService, EmployeePortalGuard],
})
export class EmployeePortalModule {}
