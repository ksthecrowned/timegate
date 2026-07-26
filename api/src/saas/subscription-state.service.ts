import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TimeGateSubscription,
  TimeGateSubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ResolvedSubscriptionState = {
  subscription: TimeGateSubscription;
  effectiveStatus: TimeGateSubscriptionStatus;
  isOperational: boolean;
  isReadOnly: boolean;
  isBlocked: boolean;
  daysUntilExpiry: number | null;
  daysUntilGraceEnd: number | null;
};

const PLATFORM_SETTINGS_ID = 'PLATFORM';

@Injectable()
export class SubscriptionStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformSettings() {
    return this.prisma.timeGatePlatformSettings.upsert({
      where: { id: PLATFORM_SETTINGS_ID },
      update: {},
      create: {
        id: PLATFORM_SETTINGS_ID,
        trialDays: 14,
        trialMaxEmployees: 10,
        trialMaxKiosks: 1,
        gracePeriodDays: 7,
      },
    });
  }

  async getLatestSubscription(companyId: string) {
    return this.prisma.timeGateSubscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveForCompany(companyId: string): Promise<ResolvedSubscriptionState | null> {
    const [company, subscription, settings] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, suspendedAt: true },
      }),
      this.getLatestSubscription(companyId),
      this.getPlatformSettings(),
    ]);
    if (!company || !subscription) return null;

    const effectiveStatus = this.resolveEffectiveStatus(
      subscription,
      company.suspendedAt,
      settings.gracePeriodDays,
      new Date(),
    );

    const now = Date.now();
    const expiryMs = subscription.expiresAt?.getTime() ?? null;
    const graceEndMs =
      subscription.graceEndsAt?.getTime() ??
      (expiryMs != null
        ? expiryMs + settings.gracePeriodDays * 24 * 60 * 60 * 1000
        : null);

    return {
      subscription,
      effectiveStatus,
      isOperational:
        effectiveStatus === TimeGateSubscriptionStatus.TRIAL ||
        effectiveStatus === TimeGateSubscriptionStatus.ACTIVE,
      isReadOnly: effectiveStatus === TimeGateSubscriptionStatus.GRACE_READ_ONLY,
      isBlocked:
        effectiveStatus === TimeGateSubscriptionStatus.BLOCKED ||
        effectiveStatus === TimeGateSubscriptionStatus.SUSPENDED,
      daysUntilExpiry:
        expiryMs != null ? Math.ceil((expiryMs - now) / (1000 * 60 * 60 * 24)) : null,
      daysUntilGraceEnd:
        graceEndMs != null
          ? Math.ceil((graceEndMs - now) / (1000 * 60 * 60 * 24))
          : null,
    };
  }

  resolveEffectiveStatus(
    subscription: Pick<
      TimeGateSubscription,
      'status' | 'expiresAt' | 'trialEndsAt' | 'graceEndsAt'
    >,
    suspendedAt: Date | null | undefined,
    gracePeriodDays: number,
    now: Date,
  ): TimeGateSubscriptionStatus {
    if (suspendedAt) {
      return TimeGateSubscriptionStatus.SUSPENDED;
    }

    const expiry = subscription.expiresAt;
    if (expiry && expiry > now) {
      return subscription.status === TimeGateSubscriptionStatus.TRIAL
        ? TimeGateSubscriptionStatus.TRIAL
        : TimeGateSubscriptionStatus.ACTIVE;
    }

    if (!expiry) {
      return subscription.status;
    }

    const graceEnd =
      subscription.graceEndsAt ??
      new Date(expiry.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
    if (now <= graceEnd) {
      return TimeGateSubscriptionStatus.GRACE_READ_ONLY;
    }
    return TimeGateSubscriptionStatus.BLOCKED;
  }

  async persistComputedStatus(companyId: string) {
    const resolved = await this.resolveForCompany(companyId);
    if (!resolved) return null;
    const { subscription, effectiveStatus } = resolved;
    if (subscription.status === effectiveStatus) return resolved;

    const settings = await this.getPlatformSettings();
    const graceEndsAt =
      effectiveStatus === TimeGateSubscriptionStatus.GRACE_READ_ONLY &&
      !subscription.graceEndsAt &&
      subscription.expiresAt
        ? new Date(
            subscription.expiresAt.getTime() +
              settings.gracePeriodDays * 24 * 60 * 60 * 1000,
          )
        : subscription.graceEndsAt;

    await this.prisma.timeGateSubscription.update({
      where: { id: subscription.id },
      data: {
        status: effectiveStatus,
        ...(graceEndsAt ? { graceEndsAt } : {}),
      },
    });

    return this.resolveForCompany(companyId);
  }

  buildSubscriptionUpdateFromPlan(
    plan: {
      id: string;
      code: string;
      maxEmployees: number;
      maxKiosks: number;
      durationDays: number | null;
    },
    expiresAtOverride?: Date,
  ): Prisma.TimeGateSubscriptionUpdateInput {
    const expiresAt =
      expiresAtOverride ??
      (plan.durationDays
        ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
        : undefined);

    return {
      plan: plan.code,
      planRef: { connect: { id: plan.id } },
      maxEmployees: plan.maxEmployees,
      maxKiosks: plan.maxKiosks,
      status: TimeGateSubscriptionStatus.ACTIVE,
      trialEndsAt: null,
      graceEndsAt: null,
      ...(expiresAt ? { expiresAt } : {}),
    };
  }
}
