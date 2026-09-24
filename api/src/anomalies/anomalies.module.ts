import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { PunchClaimsModule } from '../punch-claims/punch-claims.module';
import { SaasModule } from '../saas/saas.module';
import { ManagerModule } from '../manager/manager.module';
import { AnomaliesController } from './anomalies.controller';
import { AnomaliesService } from './anomalies.service';

@Module({
  imports: [AttendanceModule, PunchClaimsModule, SaasModule, ManagerModule],
  controllers: [AnomaliesController],
  providers: [AnomaliesService],
  exports: [AnomaliesService],
})
export class AnomaliesModule {}
