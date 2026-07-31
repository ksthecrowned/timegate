import { Module } from '@nestjs/common';
import { LateRecordsController } from './late-records.controller';
import { LateRecordsService } from './late-records.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  controllers: [LateRecordsController],
  providers: [LateRecordsService, CloudflareR2Service],
  exports: [LateRecordsService],
})
export class LateRecordsModule {}
