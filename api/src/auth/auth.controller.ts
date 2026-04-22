import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AllowInactiveSubscription } from '../common/decorators/allow-inactive-subscription.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';

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
  @Post('mobile/bootstrap')
  mobileBootstrap(@Body() dto: LoginDto) {
    return this.auth.mobileBootstrap(dto);
  }

  @Roles(Role.ADMIN)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.auth.createUser(dto);
  }

  @AllowInactiveSubscription()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('activate')
  activate(@CurrentUser() user: JwtUser, @Body() dto: ActivateSubscriptionDto) {
    return this.auth.activateSubscription(user, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('super-admin/organizations')
  listOrganizations() {
    return this.auth.listOrganizations();
  }

  @AllowInactiveSubscription()
  @Get('subscription-status')
  subscriptionStatus(@CurrentUser() user: JwtUser) {
    return this.auth.getSubscriptionStatus(user);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('super-admin/organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.auth.createOrganization(dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('super-admin/organizations/:organizationId/admins')
  createOrganizationAdmin(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateOrganizationAdminDto,
  ) {
    return this.auth.createOrganizationAdmin(organizationId, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('super-admin/organizations/:organizationId/activation-keys')
  createActivationKey(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateActivationKeyDto,
  ) {
    return this.auth.createActivationKey(organizationId, dto);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('mobile/provision')
  provisionMobile(@Body() dto: MobileProvisionDto) {
    return this.auth.provisionMobile(dto);
  }

  @Public()
  @Post('mobile/verify')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  verifyMobile(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    // Fallback raw logs to ease field debugging even if Nest logger levels/config differ.
    console.log(
      `[TimeGateAPI][mobile/verify] incoming request photoSize=${file?.size ?? 0} hasAuth=${Boolean(authorization)}`,
    );
    this.logger.log(
      `[mobile/verify] request received (photoSize=${file?.size ?? 0} bytes, hasAuth=${Boolean(authorization)})`,
    );
    const token = this.extractBearerToken(authorization);
    return this.auth.verifyMobilePhoto(token, file);
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
