import { Module } from '@nestjs/common';
import { PayGroupsController } from './pay-groups.controller';
import { PayGroupsService } from './pay-groups.service';

@Module({
  controllers: [PayGroupsController],
  providers: [PayGroupsService],
  exports: [PayGroupsService],
})
export class PayGroupsModule {}
