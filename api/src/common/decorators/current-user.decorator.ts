import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import type { PlatformAdminRole } from '../constants/platform-admin';

export type JwtUser = {
  sub: string;
  email: string;
  /** `admin` = platform Admin entity; `user` = tenant User entity. */
  kind: 'admin' | 'user';
  role: TimeGateUserRole | PlatformAdminRole;
  companyId: string | null;
  /** Set when User is linked to Employee (portal employé). */
  employeeId?: string | null;
  deviceInstallId?: string | null;
  deviceTrust?: 'TRUSTED' | 'PENDING';
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  },
);
