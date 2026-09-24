import { Module } from '@nestjs/common';
import { SaasModule } from '../saas/saas.module';
import { ClientMissionsController } from './client-missions.controller';
import { PublicClientMissionsController } from './public-client-missions.controller';
import { ClientMissionsService } from './client-missions.service';

@Module({
  imports: [SaasModule],
  controllers: [ClientMissionsController, PublicClientMissionsController],
  providers: [ClientMissionsService],
  exports: [ClientMissionsService],
})
export class ClientMissionsModule {}
