import { Module } from '@nestjs/common';
import { PunchClaimsController } from './punch-claims.controller';
import { PunchClaimsService } from './punch-claims.service';

@Module({
  controllers: [PunchClaimsController],
  providers: [PunchClaimsService],
  exports: [PunchClaimsService],
})
export class PunchClaimsModule {}
