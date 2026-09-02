import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Logger,
  MessageEvent,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeGateUserRole } from '@prisma/client';
import { Observable, from, switchMap } from 'rxjs';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { AllowInactiveSubscription } from '../common/decorators/allow-inactive-subscription.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { KioskRealtimeService } from '../kiosks/kiosk-realtime.service';
import { AuthService } from './auth.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';
import { MobileVerifyPinDto } from './dto/mobile-verify-pin.dto';
import { MobileVerifyNfcDto } from './dto/mobile-verify-nfc.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmployeeIdentifyDto, EmployeeLoginDto } from './dto/employee-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private auth: AuthService,
    private readonly kioskRealtime: KioskRealtimeService,
  ) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.revokeRefreshToken(dto.refresh_token);
  }

  @Public()
  @Post('employee/identify')
  employeeIdentify(@Body() dto: EmployeeIdentifyDto) {
    return this.auth.employeeIdentify(dto);
  }

  @Public()
  @Post('employee/login')
  employeeLogin(@Body() dto: EmployeeLoginDto) {
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
  @Post('kiosk/bootstrap')
  kioskBootstrap(@Body() dto: LoginDto) {
    return this.auth.mobileBootstrap(dto);
  }

  /** @deprecated Use POST /auth/kiosk/bootstrap */
  @Public()
  @Post('mobile/bootstrap')
  mobileBootstrap(@Body() dto: LoginDto) {
    return this.kioskBootstrap(dto);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post('users')
  createUser(@CurrentUser() user: JwtUser, @Body() dto: CreateUserDto) {
    return this.auth.createUser(user, dto);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Get('users')
  listUsers(@CurrentUser() user: JwtUser) {
    return this.auth.listUsers(user);
  }

  @AllowInactiveSubscription()
  @Roles(TimeGateUserRole.ADMIN, PLATFORM_ADMIN)
  @Post('activate')
  activate(@CurrentUser() user: JwtUser, @Body() dto: ActivateSubscriptionDto) {
    return this.auth.activateSubscription(user, dto);
  }

  @Roles(PLATFORM_ADMIN)
  @Get('super-admin/organizations')
  listOrganizations() {
    return this.auth.listOrganizations();
  }

  @Roles(PLATFORM_ADMIN)
  @Get('super-admin/activation-keys')
  listActivationKeys() {
    return this.auth.listActivationKeys();
  }

  @Roles(PLATFORM_ADMIN)
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

  @Roles(PLATFORM_ADMIN)
  @Post('super-admin/organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.auth.createOrganization(dto);
  }

  @Roles(PLATFORM_ADMIN)
  @Post('super-admin/organizations/:organizationId/admins')
  createOrganizationAdmin(
    @Param('organizationId', DocIdPipe) organizationId: string,
    @Body() dto: CreateOrganizationAdminDto,
  ) {
    return this.auth.createOrganizationAdmin(organizationId, dto);
  }

  @Roles(PLATFORM_ADMIN)
  @Post('super-admin/organizations/:organizationId/activation-keys')
  createActivationKey(
    @Param('organizationId', DocIdPipe) organizationId: string,
    @Body() dto: CreateActivationKeyDto,
  ) {
    return this.auth.createActivationKey(organizationId, dto);
  }

  @Public()
  @Get('kiosk/config')
  kioskConfig(@Headers('authorization') authorization: string | undefined) {
    const token = this.extractBearerToken(authorization);
    return this.auth.getMobileConfig(token);
  }

  /** @deprecated Use GET /auth/kiosk/config */
  @Public()
  @Get('mobile/config')
  mobileConfig(@Headers('authorization') authorization: string | undefined) {
    return this.kioskConfig(authorization);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('kiosk/provision')
  provisionKiosk(@Body() dto: MobileProvisionDto) {
    return this.auth.provisionMobile(dto);
  }

  /** @deprecated Use POST /auth/kiosk/provision */
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('mobile/provision')
  provisionMobile(@Body() dto: MobileProvisionDto) {
    return this.provisionKiosk(dto);
  }

  @Public()
  @Post('kiosk/heartbeat')
  kioskHeartbeat(@Headers('authorization') authorization: string | undefined) {
    const token = this.extractBearerToken(authorization);
    return this.auth.heartbeatMobile(token);
  }

  /** @deprecated Use POST /auth/kiosk/heartbeat */
  @Public()
  @Post('mobile/heartbeat')
  mobileHeartbeat(@Headers('authorization') authorization: string | undefined) {
    return this.kioskHeartbeat(authorization);
  }

  /**
   * SSE stream for the provisioned kiosk (lifetime token).
   * Emits `access_revoked` when an admin resets / deactivates / deletes the device.
   */
  @Public()
  @Sse('kiosk/events')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  kioskEvents(
    @Headers('authorization') authorization: string | undefined,
  ): Observable<MessageEvent> {
    const token = this.extractBearerToken(authorization);
    return from(this.auth.resolveMobileDevice(token)).pipe(
      switchMap(({ kioskId }) => this.kioskRealtime.stream(kioskId)),
    );
  }

  /** @deprecated Use GET /auth/kiosk/events */
  @Public()
  @Sse('mobile/events')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  mobileEvents(
    @Headers('authorization') authorization: string | undefined,
  ): Observable<MessageEvent> {
    return this.kioskEvents(authorization);
  }

  @Public()
  @Post('kiosk/verify')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  verifyKiosk(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body('offlineSync') offlineSyncRaw: string | undefined,
    @Body('capturedAt') capturedAtRaw: string | undefined,
    @Body('latitude') latitudeRaw: string | undefined,
    @Body('longitude') longitudeRaw: string | undefined,
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
    const latitude = latitudeRaw?.trim() ? Number(latitudeRaw) : undefined;
    const longitude = longitudeRaw?.trim() ? Number(longitudeRaw) : undefined;
    return this.auth.verifyMobilePhoto(token, file, {
      idempotencyKey: idempotencyKey?.trim() || undefined,
      requestId: requestId?.trim() || undefined,
      offlineSync,
      capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : undefined,
      latitude: latitude != null && Number.isFinite(latitude) ? latitude : undefined,
      longitude: longitude != null && Number.isFinite(longitude) ? longitude : undefined,
    });
  }

  /** @deprecated Use POST /auth/kiosk/verify */
  @Public()
  @Post('mobile/verify')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  verifyMobile(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body('offlineSync') offlineSyncRaw: string | undefined,
    @Body('capturedAt') capturedAtRaw: string | undefined,
    @Body('latitude') latitudeRaw: string | undefined,
    @Body('longitude') longitudeRaw: string | undefined,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.verifyKiosk(
      authorization,
      idempotencyKey,
      requestId,
      offlineSyncRaw,
      capturedAtRaw,
      latitudeRaw,
      longitudeRaw,
      file,
    );
  }

  @Public()
  @Post('kiosk/verify-pin')
  verifyKioskPin(
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

  /** @deprecated Use POST /auth/kiosk/verify-pin */
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
    return this.verifyKioskPin(
      authorization,
      idempotencyKey,
      requestId,
      dto,
      offlineSyncRaw,
      capturedAtRaw,
    );
  }

  @Public()
  @Post('kiosk/verify-nfc')
  verifyKioskNfc(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: MobileVerifyNfcDto,
    @Body('offlineSync') offlineSyncRaw?: string,
    @Body('capturedAt') capturedAtRaw?: string,
  ) {
    const token = this.extractBearerToken(authorization);
    const offlineSync = `${offlineSyncRaw ?? ''}`.trim().toLowerCase() === '1';
    const capturedAt = capturedAtRaw?.trim() ? new Date(capturedAtRaw) : undefined;
    return this.auth.verifyMobileNfc(token, dto, {
      idempotencyKey: idempotencyKey?.trim() || undefined,
      requestId: requestId?.trim() || undefined,
      offlineSync,
      capturedAt: capturedAt && !Number.isNaN(capturedAt.getTime()) ? capturedAt : undefined,
    });
  }

  /** @deprecated Use POST /auth/kiosk/verify-nfc */
  @Public()
  @Post('mobile/verify-nfc')
  verifyMobileNfc(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: MobileVerifyNfcDto,
    @Body('offlineSync') offlineSyncRaw?: string,
    @Body('capturedAt') capturedAtRaw?: string,
  ) {
    return this.verifyKioskNfc(
      authorization,
      idempotencyKey,
      requestId,
      dto,
      offlineSyncRaw,
      capturedAtRaw,
    );
  }

  @Public()
  @Post('kiosk/qr-challenge')
  createKioskQrChallenge(@Headers('authorization') authorization: string | undefined) {
    const token = this.extractBearerToken(authorization);
    return this.auth.createQrChallenge(token);
  }

  /** @deprecated Use POST /auth/kiosk/qr-challenge */
  @Public()
  @Post('mobile/qr-challenge')
  createQrChallenge(@Headers('authorization') authorization: string | undefined) {
    return this.createKioskQrChallenge(authorization);
  }

  @Public()
  @Get('kiosk/qr-challenge/:challengeId/result')
  getKioskQrChallengeResult(
    @Param('challengeId', DocIdPipe) challengeId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const token = this.extractBearerToken(authorization);
    return this.auth.getQrChallengeResult(token, challengeId);
  }

  /** @deprecated Use GET /auth/kiosk/qr-challenge/:challengeId/result */
  @Public()
  @Get('mobile/qr-challenge/:challengeId/result')
  getQrChallengeResult(
    @Param('challengeId', DocIdPipe) challengeId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.getKioskQrChallengeResult(challengeId, authorization);
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
