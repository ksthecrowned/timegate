import { Module } from '@nestjs/common';
import { CompensationGridService } from './compensation-grid.service';
import { CompensationGridController } from './compensation-grid.controller';

@Module({
  controllers: [CompensationGridController],
  providers: [CompensationGridService],
  exports: [CompensationGridService],
})
export class CompensationGridModule {}
