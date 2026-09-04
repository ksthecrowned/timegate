import { Module } from '@nestjs/common';
import { SalaryAdvancesController } from './salary-advances.controller';
import { SalaryAdvancesService } from './salary-advances.service';

@Module({
  controllers: [SalaryAdvancesController],
  providers: [SalaryAdvancesService],
  exports: [SalaryAdvancesService],
})
export class SalaryAdvancesModule {}
