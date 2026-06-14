import { Module } from '@nestjs/common';
import { HolidayListsController } from './holiday-lists.controller';
import { HolidaysController } from './holidays.controller';
import { HolidayCalendarService } from './holiday-calendar.service';
import { HolidaysService } from './holidays.service';

@Module({
  controllers: [HolidaysController, HolidayListsController],
  providers: [HolidaysService, HolidayCalendarService],
  exports: [HolidaysService, HolidayCalendarService],
})
export class HolidaysModule {}
