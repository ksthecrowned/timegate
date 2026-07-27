import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PLATFORM_ADMIN } from '../constants/platform-admin';

/** Blocks platform Admin from tenant operational endpoints (employees, attendance, etc.). */
@Injectable()
export class OperationalAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.kind === 'admin' || user?.role === PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin cannot access operational tenant data');
    }
    return true;
  }
}
