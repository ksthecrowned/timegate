import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFunnelQueryDto, TrackAnalyticsEventDto } from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  track(@CurrentUser() user: JwtUser, @Body() dto: TrackAnalyticsEventDto) {
    return this.analytics.track(dto, user);
  }

  @Get('funnel')
  @UseGuards(RolesGuard, OperationalAccessGuard)
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  funnel(@CurrentUser() user: JwtUser, @Query() query: AnalyticsFunnelQueryDto) {
    return this.analytics.funnel(user, query.days);
  }
}
