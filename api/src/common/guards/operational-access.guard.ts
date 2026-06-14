import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';

/** Blocks SUPER_ADMIN from tenant operational endpoints (employees, attendance, etc.). */
@Injectable()
export class OperationalAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === TimeGateUserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin cannot access operational tenant data');
    }
    return true;
  }
}
