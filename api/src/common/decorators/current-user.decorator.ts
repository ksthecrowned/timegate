import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUser = { sub: string; email: string; role: string; organizationId: string | null };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  },
);
