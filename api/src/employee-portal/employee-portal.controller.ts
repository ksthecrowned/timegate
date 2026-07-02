import { Body, Controller, Get, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveBalanceQueryDto } from '../leaves/dto/leave-balance-query.dto';
import { EmployeePortalGuard } from './guards/employee-portal.guard';
import { EmployeePortalService } from './employee-portal.service';
import { CreateSelfLeaveDto } from './dto/create-self-leave.dto';
import { CreateSelfShiftSwapDto } from './dto/create-self-shift-swap.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { EmployeeBreakPunchService } from '../attendance/employee-break-punch.service';
import { BreakResumeDto } from './dto/break-resume.dto';
import { TrustedDeviceGuard } from '../trusted-devices/trusted-devices.guard';
import { RequireTrustedDevice } from '../trusted-devices/require-trusted-device.decorator';
import { CreatePunchClaimDto } from '../punch-claims/dto/punch-claim.dto';

@Controller('employee')
@UseGuards(JwtAuthGuard, EmployeePortalGuard, TrustedDeviceGuard)
export class EmployeePortalController {
  constructor(
    private readonly portal: EmployeePortalService,
    private readonly breakPunch: EmployeeBreakPunchService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.portal.getProfile(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMyProfileDto) {
    return this.portal.updateMyProfile(user, dto);
  }

  @Get('checkins')
  getCheckins(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyCheckins(user, query);
  }

  @Get('attendance-events')
  getAttendanceEvents(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyAttendanceEvents(user, query);
  }

  @Get('punch-claims')
  getPunchClaims(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyPunchClaims(user, query);
  }

  @Post('punch-claims')
  @RequireTrustedDevice()
  createPunchClaim(@CurrentUser() user: JwtUser, @Body() dto: CreatePunchClaimDto) {
    return this.portal.createPunchClaim(user, dto);
  }

  @Get('contracts')
  getContracts(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyContracts(user, query);
  }

  @Get('leaves')
  getLeaves(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.findMyLeaves(user, query);
  }

  @Post('leaves')
  @UseInterceptors(FileInterceptor('supportDocument', { limits: { fileSize: 5 * 1024 * 1024 } }))
  requestLeave(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateSelfLeaveDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.portal.createLeaveRequest(user, dto, file);
  }

  @Get('leave-balances')
  getLeaveBalances(@CurrentUser() user: JwtUser, @Query() query: LeaveBalanceQueryDto) {
    return this.portal.getMyLeaveBalances(user, query);
  }

  @Get('leave-types')
  getLeaveTypes(@CurrentUser() user: JwtUser) {
    return this.portal.getLeaveTypes(user);
  }

  @Post('shift-swaps')
  requestShiftSwap(@CurrentUser() user: JwtUser, @Body() dto: CreateSelfShiftSwapDto) {
    return this.portal.createShiftSwap(user, dto);
  }

  @Get('qr-punch/current')
  @RequireTrustedDevice()
  getCurrentQrPunch(@CurrentUser() user: JwtUser) {
    return this.portal.getCurrentQrPunchPayload(user);
  }

  @Get('break-resume/status')
  getBreakResumeStatus(@CurrentUser() user: JwtUser) {
    return this.breakPunch.getBreakResumeStatus(user);
  }

  @Post('break-resume')
  @RequireTrustedDevice()
  resumeBreak(@CurrentUser() user: JwtUser, @Body() dto: BreakResumeDto) {
    return this.breakPunch.resumeBreak(user, dto);
  }
}
