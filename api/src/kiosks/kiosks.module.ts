import { Module } from '@nestjs/common';
import { SaasModule } from '../saas/saas.module';
import { KiosksController } from './kiosks.controller';
import { KiosksService } from './kiosks.service';

@Module({
  imports: [SaasModule],
  controllers: [KiosksController],
  providers: [KiosksService],
  exports: [KiosksService],
})
export class KiosksModule {}
