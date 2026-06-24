import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { PlanningVsActualQueryDto } from './dto/planning-vs-actual-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Get('planning-vs-actual')
  planningVsActual(@CurrentUser() user: JwtUser, @Query() query: PlanningVsActualQueryDto) {
    return this.dashboard.planningVsActual(query, user);
  }
}
