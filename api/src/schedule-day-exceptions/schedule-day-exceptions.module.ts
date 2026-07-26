import { Module } from '@nestjs/common'
import { ScheduleDayExceptionsController } from './schedule-day-exceptions.controller'
import { ScheduleDayExceptionsService } from './schedule-day-exceptions.service'

@Module({
  controllers: [ScheduleDayExceptionsController],
  providers: [ScheduleDayExceptionsService],
  exports: [ScheduleDayExceptionsService],
})
export class ScheduleDayExceptionsModule {}
