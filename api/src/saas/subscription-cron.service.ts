import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  TimeGateNotificationType,
  TimeGateSubscriptionStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionQuotaService } from './subscription-quota.service';
import { SubscriptionStateService } from './subscription-state.service';

function isoWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionState: SubscriptionStateService,
    private readonly notifications: NotificationsService,
    private readonly quotas: SubscriptionQuotaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDailySubscriptionMaintenance() {
    const settings = await this.subscriptionState.getPlatformSettings();
    const now = new Date();
    const weekKey = isoWeekKey(now);
    const subscriptions = await this.prisma.timeGateSubscription.findMany({
      include: { company: { select: { id: true, name: true, suspendedAt: true } } },
    });

    for (const sub of subscriptions) {
      if (sub.company.suspendedAt) continue;

      const previousStatus = sub.status;
      const effective = this.subscriptionState.resolveEffectiveStatus(
        sub,
        sub.company.suspendedAt,
        settings.gracePeriodDays,
        now,
      );

      const graceEndsAt =
        effective === TimeGateSubscriptionStatus.GRACE_READ_ONLY && sub.expiresAt
          ? sub.graceEndsAt ??
            new Date(
              sub.expiresAt.getTime() + settings.gracePeriodDays * 24 * 60 * 60 * 1000,
            )
          : sub.graceEndsAt;

      if (sub.status !== effective || (graceEndsAt && !sub.graceEndsAt)) {
        await this.prisma.timeGateSubscription.update({
          where: { id: sub.id },
          data: {
            status: effective,
            ...(graceEndsAt ? { graceEndsAt } : {}),
          },
        });
      }

      if (
        previousStatus !== TimeGateSubscriptionStatus.GRACE_READ_ONLY &&
        effective === TimeGateSubscriptionStatus.GRACE_READ_ONLY
      ) {
        await this.notifications.notifySubscriptionGrace({
          companyId: sub.companyId,
          graceEndsAt,
        });
      }

      if (
        previousStatus !== TimeGateSubscriptionStatus.BLOCKED &&
        effective === TimeGateSubscriptionStatus.BLOCKED
      ) {
        await this.notifications.notifySubscriptionBlocked({ companyId: sub.companyId });
      }

      await this.maybeSendExpiryReminders(sub.companyId, sub.expiresAt, sub.status, now);
      await this.maybeSendQuotaAlerts(sub.companyId, weekKey);
    }

    this.logger.log(`Subscription maintenance completed (${subscriptions.length} rows)`);
  }

  private async maybeSendQuotaAlerts(companyId: string, weekKey: string) {
    const usage = await this.quotas.getUsage(companyId);

    const checks: Array<{
      resource: 'employees' | 'kiosks';
      used: number;
      max: number;
    }> = [
      { resource: 'employees', used: usage.employees, max: usage.maxEmployees },
      { resource: 'kiosks', used: usage.kiosks, max: usage.maxKiosks },
    ];

    for (const check of checks) {
      if (check.max <= 0) continue;
      const ratio = check.used / check.max;
      if (ratio >= 1) {
        await this.notifications.notifySubscriptionQuota({
          companyId,
          resource: check.resource,
          used: check.used,
          max: check.max,
          level: 'reached',
          weekKey,
        });
      } else if (ratio >= 0.8) {
        await this.notifications.notifySubscriptionQuota({
          companyId,
          resource: check.resource,
          used: check.used,
          max: check.max,
          level: 'warning',
          weekKey,
        });
      }
    }
  }

  private async maybeSendExpiryReminders(
    companyId: string,
    expiresAt: Date | null,
    status: TimeGateSubscriptionStatus,
    now: Date,
  ) {
    if (!expiresAt) return;

    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const reminderDays = [7, 1, 0];
    if (!reminderDays.includes(daysLeft)) return;

    const adminIds = await this.prisma.user.findMany({
      where: { companyId, timeGateRole: TimeGateUserRole.ADMIN },
      select: { id: true },
    });
    if (!adminIds.length) return;

    const isTrial = status === TimeGateSubscriptionStatus.TRIAL;
    const title =
      daysLeft === 0
        ? isTrial
          ? 'Essai TimeGate termine aujourd\'hui'
          : 'Abonnement TimeGate expire aujourd\'hui'
        : isTrial
          ? `Essai TimeGate — J-${daysLeft}`
          : `Abonnement TimeGate — J-${daysLeft}`;

    const body =
      daysLeft === 0
        ? 'Activez une cle ou contactez le support pour continuer sans interruption.'
        : `Votre ${isTrial ? 'essai' : 'abonnement'} se termine dans ${daysLeft} jour(s).`;

    await this.notifications.emit({
      companyId,
      userIds: adminIds.map((u) => u.id),
      type: isTrial
        ? TimeGateNotificationType.SUBSCRIPTION_TRIAL_REMINDER
        : TimeGateNotificationType.SUBSCRIPTION_EXPIRING,
      title,
      body,
      dedupeKey: `subscription-reminder:${companyId}:${daysLeft}:${expiresAt.toISOString().slice(0, 10)}`,
    });
  }
}
