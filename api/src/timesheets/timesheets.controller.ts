import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { FindTimesheetsQueryDto } from './dto/find-timesheets-query.dto';
import { OverrideTimesheetDto } from './dto/override-timesheet.dto';
import { RecalculateTimesheetsDto } from './dto/recalculate-timesheets.dto';
import { TimesheetsService } from './timesheets.service';

@Controller('timesheets')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class TimesheetsController {
  constructor(private readonly service: TimesheetsService) {}

  @Get()
  findAll(@Query() query: FindTimesheetsQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('recalculate')
  recalculate(@Body() dto: RecalculateTimesheetsDto, @CurrentUser() user: JwtUser) {
    return this.service.recalculate(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id/override')
  override(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: OverrideTimesheetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.override(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Get(':id/overrides')
  listOverrides(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.listOverrides(id, user);
  }
}
