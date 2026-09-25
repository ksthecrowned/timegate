import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../common/upload/fastify-file.interceptor';
import { UploadedBinaryFile } from '../common/upload/uploaded-binary-file.decorator';
import type { UploadedFile as UploadedBinary } from '../common/upload/uploaded-file';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { LeaveBalanceQueryDto } from '../leaves/dto/leave-balance-query.dto';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { EmployeePortalGuard } from './guards/employee-portal.guard';
import { EmployeePortalService } from './employee-portal.service';
import { CreateSelfLeaveDto } from './dto/create-self-leave.dto';
import { CreateSelfShiftSwapDto } from './dto/create-self-shift-swap.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { EmployeeBreakPunchService } from '../attendance/employee-break-punch.service';
import { KioskQrPunchService } from '../attendance/kiosk-qr-punch.service';
import { BreakResumeDto } from './dto/break-resume.dto';
import { TrustedDeviceGuard } from '../trusted-devices/trusted-devices.guard';
import { RequireTrustedDevice } from '../trusted-devices/require-trusted-device.decorator';
import { CreatePunchClaimDto } from '../punch-claims/dto/punch-claim.dto';
import { ScanQrChallengeDto } from './dto/scan-qr-challenge.dto';
import { SyncQrChallengesDto } from './dto/sync-qr-challenges.dto';
import {
  FindColleaguesQueryDto,
  FindMyTimesheetsQueryDto,
} from './dto/find-my-self-service.dto';

@Controller('employee')
@UseGuards(JwtAuthGuard, EmployeePortalGuard, TrustedDeviceGuard)
export class EmployeePortalController {
  constructor(
    private readonly portal: EmployeePortalService,
    private readonly breakPunch: EmployeeBreakPunchService,
    private readonly kioskQrPunch: KioskQrPunchService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.portal.getProfile(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMyProfileDto) {
    return this.portal.updateMyProfile(user, dto);
  }

  @Get('home-insights')
  getHomeInsights(@CurrentUser() user: JwtUser) {
    return this.portal.getHomeInsights(user);
  }

  @Get('colleagues')
  getColleagues(@CurrentUser() user: JwtUser, @Query() query: FindColleaguesQueryDto) {
    return this.portal.findColleagues(user, query);
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
  createPunchClaim(@CurrentUser() user: JwtUser, @Body() dto: CreatePunchClaimDto) {
    return this.portal.createPunchClaim(user, dto);
  }

  @Get('timesheets')
  getTimesheets(@CurrentUser() user: JwtUser, @Query() query: FindMyTimesheetsQueryDto) {
    return this.portal.findMyTimesheets(user, query);
  }

  @Get('timesheets/:id')
  getTimesheet(@CurrentUser() user: JwtUser, @Param('id', DocIdPipe) id: string) {
    return this.portal.findMyTimesheet(user, id);
  }

  @Get('payroll/summary')
  getPayrollSummary(@CurrentUser() user: JwtUser, @Query() query: PaginationQueryDto) {
    return this.portal.getMyPayrollSummary(user, query);
  }

  @Get('payroll/lines/:id')
  getPayrollLine(@CurrentUser() user: JwtUser, @Param('id', DocIdPipe) id: string) {
    return this.portal.getMyPayrollLine(user, id);
  }

  @Get('pending-hr')
  getPendingHr(@CurrentUser() user: JwtUser) {
    return this.portal.getPendingHr(user);
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
  @UseInterceptors(FastifyFileInterceptor('supportDocument', { limits: { fileSize: 5 * 1024 * 1024 } }))
  requestLeave(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateSelfLeaveDto,
    @UploadedBinaryFile() file?: UploadedBinary,
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

  @Post('qr-punch/scan')
  @RequireTrustedDevice()
  scanQrPunch(@CurrentUser() user: JwtUser, @Body() dto: ScanQrChallengeDto) {
    return this.kioskQrPunch.scan(user, dto.payload);
  }

  @Post('qr-punch/sync')
  @RequireTrustedDevice()
  syncQrPunch(@CurrentUser() user: JwtUser, @Body() dto: SyncQrChallengesDto) {
    return this.kioskQrPunch.sync(user, dto.items);
  }

  @Get('break-resume/status')
  getBreakResumeStatus(@CurrentUser() user: JwtUser) {
    return this.breakPunch.getBreakResumeStatus(user);
  }

  @Get('today-schedule')
  getTodaySchedule(@CurrentUser() user: JwtUser) {
    return this.portal.getTodaySchedule(user);
  }

  @Post('break-resume')
  @RequireTrustedDevice()
  resumeBreak(@CurrentUser() user: JwtUser, @Body() dto: BreakResumeDto) {
    return this.breakPunch.resumeBreak(user, dto);
  }
}
