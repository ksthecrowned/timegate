import { Module } from '@nestjs/common';
import { PayrollRunsController } from './payroll-runs.controller';
import { PayrollRunsService } from './payroll-runs.service';
import { CompensationGridModule } from '../compensation-grid/compensation-grid.module';
import { EmployeeCompensationModule } from '../employee-compensation/employee-compensation.module';

@Module({
  imports: [CompensationGridModule, EmployeeCompensationModule],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
