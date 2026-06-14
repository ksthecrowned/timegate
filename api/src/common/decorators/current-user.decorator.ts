import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';

export type JwtUser = {
  sub: string;
  email: string;
  role: TimeGateUserRole;
  companyId: string | null;
  /** Set when User is linked to Employee (portal employé). */
  employeeId?: string | null;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  },
);
