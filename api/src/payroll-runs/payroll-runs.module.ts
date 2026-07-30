import { Module } from '@nestjs/common';
import { PayrollRunsController } from './payroll-runs.controller';
import { PayrollRunsService } from './payroll-runs.service';
import { CompensationGridModule } from '../compensation-grid/compensation-grid.module';
import { EmployeeCompensationModule } from '../employee-compensation/employee-compensation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayrollDueAlertCronService } from './payroll-due-alert-cron.service';

@Module({
  imports: [CompensationGridModule, EmployeeCompensationModule, NotificationsModule],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService, PayrollDueAlertCronService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
