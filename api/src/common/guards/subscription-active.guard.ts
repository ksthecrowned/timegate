import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_INACTIVE_SUBSCRIPTION_KEY } from '../decorators/allow-inactive-subscription.decorator';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowInactive = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INACTIVE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowInactive) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;
    if (!user?.sub) return true;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!user.organizationId) return true;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId: user.organizationId,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Subscription inactive. Activate your subscription before using the application.',
      );
    }
    return true;
  }
}
