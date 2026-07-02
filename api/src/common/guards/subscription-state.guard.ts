import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TimeGateSubscriptionStatus, TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_INACTIVE_SUBSCRIPTION_KEY } from '../decorators/allow-inactive-subscription.decorator';
import { ALLOW_BLOCKED_SUBSCRIPTION_KEY } from '../decorators/allow-blocked-subscription.decorator';
import { READ_ONLY_SUBSCRIPTION_KEY } from '../decorators/read-only-subscription.decorator';
import { SubscriptionStateService } from '../../saas/subscription-state.service';

@Injectable()
export class SubscriptionStateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionState: SubscriptionStateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowBlocked = this.reflector.getAllAndOverride<boolean>(
      ALLOW_BLOCKED_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const allowInactive = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INACTIVE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowBlocked || allowInactive) return true;

    const readOnlyBypass = this.reflector.getAllAndOverride<boolean>(
      READ_ONLY_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{ user?: JwtUser; method?: string }>();
    const user = request.user;
    if (!user?.sub) return true;
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return true;
    if (!user.companyId) return true;

    const resolved = await this.subscriptionState.resolveForCompany(user.companyId);
    if (!resolved) {
      throw new ForbiddenException(
        'Aucun abonnement actif. Creez ou activez votre abonnement.',
      );
    }

    const { effectiveStatus } = resolved;
    const method = (request.method ?? 'GET').toUpperCase();
    const isReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

    if (
      effectiveStatus === TimeGateSubscriptionStatus.TRIAL ||
      effectiveStatus === TimeGateSubscriptionStatus.ACTIVE
    ) {
      return true;
    }

    if (effectiveStatus === TimeGateSubscriptionStatus.GRACE_READ_ONLY) {
      if (isReadMethod || readOnlyBypass) return true;
      throw new ForbiddenException(
        'Abonnement expire — acces lecture seule. Activez une cle pour continuer a modifier.',
      );
    }

    if (effectiveStatus === TimeGateSubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Organisation suspendue. Contactez le support TimeGate.',
      );
    }

    throw new ForbiddenException(
      'Abonnement expire. Connectez-vous et activez une cle sur /activate.',
    );
  }
}
