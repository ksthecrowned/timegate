import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { PlanningCalendarQueryDto } from './dto/planning-calendar-query.dto';
import { PlanningService } from './planning.service';

@Controller('planning')
@UseGuards(JwtAuthGuard, OperationalAccessGuard)
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Get('calendar')
  getCalendar(@Query() query: PlanningCalendarQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.getCalendar(query, user);
  }
}
