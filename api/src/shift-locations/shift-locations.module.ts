import { Module } from '@nestjs/common';
import { ShiftLocationsController } from './shift-locations.controller';
import { ShiftLocationsService } from './shift-locations.service';

@Module({
  controllers: [ShiftLocationsController],
  providers: [ShiftLocationsService],
  exports: [ShiftLocationsService],
})
export class ShiftLocationsModule {}
