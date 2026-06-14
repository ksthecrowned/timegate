import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class EmployeePortalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: JwtUser }>().user;
    if (!user?.employeeId || user.role !== TimeGateUserRole.EMPLOYEE) {
      throw new ForbiddenException('Employee portal access required');
    }
    return true;
  }
}
