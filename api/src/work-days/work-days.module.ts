import { Module } from '@nestjs/common';
import { WorkDaysController } from './work-days.controller';
import { WorkDaysService } from './work-days.service';

@Module({
  controllers: [WorkDaysController],
  providers: [WorkDaysService],
})
export class WorkDaysModule {}
