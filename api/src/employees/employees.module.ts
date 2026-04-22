import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, CloudflareR2Service],
  exports: [EmployeesService],
})
export class EmployeesModule {}
