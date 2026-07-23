import { Module } from '@nestjs/common';
import { HolidaysModule } from '../holidays/holidays.module';
import { ManagerModule } from '../manager/manager.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [HolidaysModule, ManagerModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
