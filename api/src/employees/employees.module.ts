import { Module } from '@nestjs/common';
import { LeavesModule } from '../leaves/leaves.module';
import { SaasModule } from '../saas/saas.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  imports: [LeavesModule, SaasModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, CloudflareR2Service],
  exports: [EmployeesService],
})
export class EmployeesModule {}
