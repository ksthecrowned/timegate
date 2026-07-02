import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BulkReviewEventsDto } from './dto/bulk-review-events.dto';
import { ManagerInboxQueryDto, ManagerTeamTodayQueryDto } from './dto/manager-query.dto';
import { ManagerService } from './manager.service';

@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
export class ManagerController {
  constructor(private readonly manager: ManagerService) {}

  @Get('team-today')
  teamToday(@CurrentUser() user: JwtUser, @Query() query: ManagerTeamTodayQueryDto) {
    return this.manager.teamToday(query, user);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: JwtUser, @Query() query: ManagerInboxQueryDto) {
    return this.manager.inbox(query, user);
  }

  @Post('review-events/bulk')
  bulkReviewEvents(@CurrentUser() user: JwtUser, @Body() dto: BulkReviewEventsDto) {
    const { eventIds, ...review } = dto;
    return this.manager.bulkReviewEvents({ eventIds, ...review }, user);
  }
}
