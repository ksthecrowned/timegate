import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveBalanceQueryDto } from '../leaves/dto/leave-balance-query.dto';
import { EmployeePortalGuard } from './guards/employee-portal.guard';
import { EmployeePortalService } from './employee-portal.service';
import { CreateSelfLeaveDto } from './dto/create-self-leave.dto';

@Controller('employee')
@UseGuards(JwtAuthGuard, EmployeePortalGuard)
export class EmployeePortalController {
  constructor(private readonly portal: EmployeePortalService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.portal.getProfile(user);
  }

  @Get('checkins')
  getCheckins(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyCheckins(user, query);
  }

  @Get('leaves')
  getLeaves(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyLeaves(user, query);
  }

  @Post('leaves')
  requestLeave(@CurrentUser() user: JwtUser, @Body() dto: CreateSelfLeaveDto) {
    return this.portal.createLeaveRequest(user, dto);
  }

  @Get('leave-balances')
  getLeaveBalances(@CurrentUser() user: JwtUser, @Query() query: LeaveBalanceQueryDto) {
    return this.portal.getMyLeaveBalances(user, query);
  }

  @Get('leave-types')
  getLeaveTypes(@CurrentUser() user: JwtUser) {
    return this.portal.getLeaveTypes(user);
  }
}
