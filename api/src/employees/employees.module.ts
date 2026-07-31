import { Module } from '@nestjs/common';
import { LeavesModule } from '../leaves/leaves.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayGroupsModule } from '../pay-groups/pay-groups.module';
import { CompensationGridModule } from '../compensation-grid/compensation-grid.module';
import { EmployeeCompensationModule } from '../employee-compensation/employee-compensation.module';
import { SaasModule } from '../saas/saas.module';
import { EmployeeContractCronService } from './employee-contract-cron.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  imports: [
    LeavesModule,
    SaasModule,
    NotificationsModule,
    PayGroupsModule,
    CompensationGridModule,
    EmployeeCompensationModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, CloudflareR2Service, EmployeeContractCronService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
