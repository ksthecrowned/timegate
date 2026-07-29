import { Module } from '@nestjs/common';
import { SaasModule } from '../saas/saas.module';
import { KioskRealtimeService } from './kiosk-realtime.service';
import { KiosksController } from './kiosks.controller';
import { KiosksService } from './kiosks.service';

@Module({
  imports: [SaasModule],
  controllers: [KiosksController],
  providers: [KiosksService, KioskRealtimeService],
  exports: [KiosksService, KioskRealtimeService],
})
export class KiosksModule {}
