import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AllowInactiveSubscription } from '../common/decorators/allow-inactive-subscription.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { AuthService } from './auth.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';
import { MobileVerifyPinDto } from './dto/mobile-verify-pin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('employee/login')
  employeeLogin(@Body() dto: LoginDto) {
    return this.auth.employeeLogin(dto);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Public()
  @Post('verify-reset-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.auth.verifyResetCode(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Post('mobile/bootstrap')
  mobileBootstrap(@Body() dto: LoginDto) {
    return this.auth.mobileBootstrap(dto);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.auth.createUser(dto);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Get('users')
  listUsers(@CurrentUser() user: JwtUser) {
    return this.auth.listUsers(user);
  }

  @AllowInactiveSubscription()
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.SUPER_ADMIN)
  @Post('activate')
  activate(@CurrentUser() user: JwtUser, @Body() dto: ActivateSubscriptionDto) {
    return this.auth.activateSubscription(user, dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Get('super-admin/organizations')
  listOrganizations() {
    return this.auth.listOrganizations();
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Get('super-admin/organizations/:organizationId')
  getOrganization(@Param('organizationId', DocIdPipe) organizationId: string) {
    return this.auth.getOrganization(organizationId);
  }

  @AllowInactiveSubscription()
  @Get('subscription-status')
  subscriptionStatus(@CurrentUser() user: JwtUser) {
    return this.auth.getSubscriptionStatus(user);
  }

  @AllowInactiveSubscription()
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getMe(user);
  }

  @AllowInactiveSubscription()
  @Patch('me')
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user, dto);
  }

  @AllowInactiveSubscription()
  @Patch('me/password')
  changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post('super-admin/organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.auth.createOrganization(dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post('super-admin/organizations/:organizationId/admins')
  createOrganizationAdmin(
    @Param('organizationId', DocIdPipe) organizationId: string,
    @Body() dto: CreateOrganizationAdminDto,
  ) {
    return this.auth.createOrganizationAdmin(organizationId, dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post('super-admin/organizations/:organizationId/activation-keys')
  createActivationKey(
    @Param('organizationId', DocIdPipe) organizationId: string,
    @Body() dto: CreateActivationKeyDto,
  ) {
    return this.auth.createActivationKey(organizationId, dto);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('mobile/provision')
  provisionMobile(@Body() dto: MobileProvisionDto) {
    return this.auth.provisionMobile(dto);
  }

  @Public()
  @Post('mobile/heartbeat')
  mobileHeartbeat(@Headers('authorization') authorization: string | undefined) {
    const token = this.extractBearerToken(authorization);
    return this.auth.heartbeatMobile(token);
  }

  @Public()
  @Post('mobile/verify')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  verifyMobile(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body('offlineSync') offlineSyncRaw: string | undefined,
    @Body('capturedAt') capturedAtRaw: string | undefined,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const token = this.extractBearerToken(authorization);
    const offlineSync = `${offlineSyncRaw ?? ''}`.trim().toLowerCase() === '1';
    const capturedAt = capturedAtRaw?.trim() ? new Date(capturedAtRaw) : undefined;
    return this.auth.verifyMobilePhoto(token, file, {
      idempotencyKey: idempotencyKey?.trim() || undefined,
      requestId: requestId?.trim() || undefined,
      offlineSync,
      capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : undefined,
    });
  }

  @Public()
  @Post('mobile/verify-pin')
  verifyMobilePin(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: MobileVerifyPinDto,
    @Body('offlineSync') offlineSyncRaw?: string,
    @Body('capturedAt') capturedAtRaw?: string,
  ) {
    const token = this.extractBearerToken(authorization);
    const offlineSync = `${offlineSyncRaw ?? ''}`.trim().toLowerCase() === '1';
    const capturedAt = capturedAtRaw?.trim() ? new Date(capturedAtRaw) : undefined;
    return this.auth.verifyMobilePin(token, dto, {
      idempotencyKey: idempotencyKey?.trim() || undefined,
      requestId: requestId?.trim() || undefined,
      offlineSync,
      capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : undefined,
    });
  }

  private extractBearerToken(authorization: string | undefined): string {
    const value = authorization?.trim() ?? '';
    if (!value.toLowerCase().startsWith('bearer ')) {
      throw new BadRequestException('Missing Bearer token');
    }
    const token = value.slice(7).trim();
    if (!token) {
      throw new BadRequestException('Missing Bearer token');
    }
    return token;
  }
}
