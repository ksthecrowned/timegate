import { Module } from '@nestjs/common';
import { LuxandCloudService } from './luxand-cloud.service';
import { LuxandController } from './luxand.controller';

@Module({
  controllers: [LuxandController],
  providers: [LuxandCloudService],
  exports: [LuxandCloudService],
})
export class LuxandModule {}
