import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { TrustedDevicesModule } from '../trusted-devices/trusted-devices.module';
import { LeavesModule } from '../leaves/leaves.module';
import { LeaveTypesModule } from '../leave-types/leave-types.module';
import { ShiftSwapsModule } from '../shift-swaps/shift-swaps.module';
import { PunchClaimsModule } from '../punch-claims/punch-claims.module';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { EmployeePortalController } from './employee-portal.controller';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeePortalGuard } from './guards/employee-portal.guard';
import { TrustedDeviceGuard } from '../trusted-devices/trusted-devices.guard';

@Module({
  imports: [
    AttendanceModule,
    TrustedDevicesModule,
    LeavesModule,
    LeaveTypesModule,
    ShiftSwapsModule,
    PunchClaimsModule,
  ],
  controllers: [EmployeePortalController],
  providers: [EmployeePortalService, EmployeePortalGuard, TrustedDeviceGuard, CloudflareR2Service],
})
export class EmployeePortalModule {}
