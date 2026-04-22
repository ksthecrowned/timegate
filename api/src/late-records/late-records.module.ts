import { Module } from '@nestjs/common';
import { LateRecordsController } from './late-records.controller';
import { LateRecordsService } from './late-records.service';

@Module({
  controllers: [LateRecordsController],
  providers: [LateRecordsService],
})
export class LateRecordsModule {}
