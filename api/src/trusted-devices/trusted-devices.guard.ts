import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { REQUIRE_TRUSTED_DEVICE_KEY } from './require-trusted-device.decorator';
import { TrustedDevicesService } from './trusted-devices.service';

@Injectable()
export class TrustedDeviceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly trustedDevices: TrustedDevicesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_TRUSTED_DEVICE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const user = context.switchToHttp().getRequest<{ user?: JwtUser }>().user;
    if (!user || user.role !== TimeGateUserRole.EMPLOYEE) return true;

    await this.trustedDevices.assertTrusted(user);
    return true;
  }
}
