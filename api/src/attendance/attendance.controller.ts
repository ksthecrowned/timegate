import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AttendanceDaysService } from './attendance-days.service';
import { AttendanceService } from './attendance.service';
import { FindAttendanceDaysQueryDto } from './dto/find-attendance-days-query.dto';
import { ExportAttendanceDaysQueryDto } from './dto/export-attendance-days-query.dto';
import { RecalculateAttendanceDaysDto } from './dto/recalculate-attendance-days.dto';
import { UpdateAttendanceDayDto } from './dto/update-attendance-day.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FindAttendanceEventsQueryDto } from './dto/find-attendance-events-query.dto';
import { ReviewAttendanceEventDto } from './dto/review-attendance-event.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class AttendanceController {
  constructor(
    private attendance: AttendanceService,
    private attendanceDays: AttendanceDaysService,
  ) {}

  @Get('days')
  findDays(@CurrentUser() user: JwtUser, @Query() query: FindAttendanceDaysQueryDto) {
    return this.attendanceDays.findAll(query, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Get('days/export')
  exportDays(@CurrentUser() user: JwtUser, @Query() query: ExportAttendanceDaysQueryDto) {
    return this.attendanceDays.exportCsv(query, user);
  }

  @Get('days/:id')
  findDay(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.attendanceDays.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('days/recalculate')
  recalculateDays(@Body() dto: RecalculateAttendanceDaysDto, @CurrentUser() user: JwtUser) {
    return this.attendanceDays.recalculate(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch('days/:id')
  updateDay(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateAttendanceDayDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.attendanceDays.update(id, dto, user);
  }

  @Get('events')
  findEvents(@CurrentUser() user: JwtUser, @Query() query: FindAttendanceEventsQueryDto) {
    return this.attendance.findEvents(query, user);
  }

  @Get('events/:id')
  findEvent(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.attendance.findEvent(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Patch('events/:id/review')
  reviewEvent(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: ReviewAttendanceEventDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.attendance.reviewEvent(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Get('events/:id/reviews')
  getEventReviews(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.attendance.getEventReviews(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendance.createCheckin(dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.attendance.findCheckins(query, user);
  }
}
