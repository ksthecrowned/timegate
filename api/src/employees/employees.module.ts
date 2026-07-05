import { Module } from '@nestjs/common';
import { LeavesModule } from '../leaves/leaves.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SaasModule } from '../saas/saas.module';
import { EmployeeContractCronService } from './employee-contract-cron.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  imports: [LeavesModule, SaasModule, NotificationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, CloudflareR2Service, EmployeeContractCronService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
