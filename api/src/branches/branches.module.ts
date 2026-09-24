import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { SaasModule } from '../saas/saas.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  imports: [LocationsModule, SaasModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
