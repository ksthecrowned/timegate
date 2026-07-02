import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import {
  FindPunchClaimsQueryDto,
  ReviewPunchClaimDto,
} from './dto/punch-claim.dto';
import { PunchClaimsService } from './punch-claims.service';

@Controller('punch-claims')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class PunchClaimsController {
  constructor(private readonly service: PunchClaimsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Get()
  findAll(@Query() query: FindPunchClaimsQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Patch(':id/review')
  review(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: ReviewPunchClaimDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.review(id, dto, user);
  }
}
