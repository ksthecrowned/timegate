import { Module } from '@nestjs/common';
import { EmployeeCompensationService } from './employee-compensation.service';
import { EmployeeCompensationController } from './employee-compensation.controller';

@Module({
  controllers: [EmployeeCompensationController],
  providers: [EmployeeCompensationService],
  exports: [EmployeeCompensationService],
})
export class EmployeeCompensationModule {}
