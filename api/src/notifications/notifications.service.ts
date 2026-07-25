import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TimeGateAttendanceEventType,
  TimeGateNotificationType,
  TimeGateUserRole,
} from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PushDeliveryService } from '../push/push-delivery.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';
import { NotificationEmailService } from './notification-email.service';

export type EmitNotificationInput = {
  companyId: string;
  userIds: string[];
  type: TimeGateNotificationType;
  title: string;
  body: string;
  meta?: Prisma.InputJsonValue;
  dedupeKey?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: NotificationRecipientResolver,
    private readonly push: PushDeliveryService,
    private readonly webhooks: WebhooksService,
    private readonly email: NotificationEmailService,
  ) {}

  async findAll(query: NotificationQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.TimeGateNotificationWhereInput = {
      userId: user.sub,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.timeGateNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timeGateNotification.count({ where }),
      this.prisma.timeGateNotification.count({
        where: { userId: user.sub, readAt: null },
      }),
    ]);

    return {
      data: items.map((item) => this.toApiShape(item)),
      meta: { page, limit, total, unreadCount },
    };
  }

  async getUnreadCount(user: JwtUser) {
    const count = await this.prisma.timeGateNotification.count({
      where: { userId: user.sub, readAt: null },
    });
    return { count };
  }

  async markRead(id: string, user: JwtUser) {
    const notification = await this.prisma.timeGateNotification.findFirst({
      where: { id, userId: user.sub },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.readAt) {
      return this.toApiShape(notification);
    }
    const updated = await this.prisma.timeGateNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toApiShape(updated);
  }

  async markAllRead(user: JwtUser) {
    const result = await this.prisma.timeGateNotification.updateMany({
      where: { userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async emit(input: EmitNotificationInput): Promise<number> {
    const rule = await this.resolveRule(input.companyId, input.type);
    if (!rule.inAppEnabled && !rule.pushEnabled && !rule.emailEnabled) {
      return 0;
    }

    const uniqueUserIds = [...new Set(input.userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return 0;
    }

    let created = 0;
    const pushedUserIds: string[] = [];
    const emailedUserIds: string[] = [];
    for (const userId of uniqueUserIds) {
      if (rule.inAppEnabled && input.dedupeKey) {
        const existing = await this.prisma.timeGateNotification.findFirst({
          where: {
            userId,
            type: input.type,
            meta: { path: ['dedupeKey'], equals: input.dedupeKey },
          },
          select: { id: true },
        });
        if (existing) continue;
      }

      if (rule.inAppEnabled) {
        await this.prisma.timeGateNotification.create({
          data: {
            id: generateDocId('NTF'),
            companyId: input.companyId,
            userId,
            type: input.type,
            title: input.title,
            body: input.body,
            meta: {
              ...(typeof input.meta === 'object' && input.meta !== null && !Array.isArray(input.meta)
                ? input.meta
                : {}),
              ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
            },
          },
        });
        created += 1;
      }
      if (rule.pushEnabled) {
        pushedUserIds.push(userId);
      }
      if (rule.emailEnabled) {
        emailedUserIds.push(userId);
      }
    }

    if (pushedUserIds.length > 0) {
      void this.push
        .sendToUsers(pushedUserIds, {
          title: input.title,
          body: input.body,
          type: input.type,
          data: {
            companyId: input.companyId,
            notificationType: input.type,
            type: input.type,
            ...flattenPushMeta(input.meta),
          },
        })
        .catch((err) =>
          this.logger.warn(`Push dispatch failed: ${err instanceof Error ? err.message : err}`),
        );
    }
    if (emailedUserIds.length > 0) {
      void this.sendEmailsForUsers(emailedUserIds, input).catch((err) =>
        this.logger.warn(`Email dispatch failed: ${err instanceof Error ? err.message : err}`),
      );
    }

    if (created > 0) {
      this.logger.debug(`Emitted ${created} notification(s) [${input.type}]`);
      void this.webhooks.emit(input.companyId, 'notification.emitted', {
        type: input.type,
        title: input.title,
        createdCount: created,
        userCount: uniqueUserIds.length,
        dedupeKey: input.dedupeKey ?? null,
      });
    }
    return created;
  }

  private async sendEmailsForUsers(userIds: string[], input: EmitNotificationInput) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, enabled: true },
      select: { email: true },
    });
    const emails = users
      .map((u) => u.email?.trim())
      .filter((v): v is string => Boolean(v));
    if (emails.length === 0) return;
    await this.email.sendNotificationEmail({
      to: emails,
      title: input.title,
      body: input.body,
      type: input.type,
    });
  }

  async listRules(user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
    const rows = await this.prisma.timeGateNotificationRule.findMany({
      where: { companyId: user.companyId },
      select: {
        type: true,
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
      },
    });
    const byType = new Map(rows.map((row) => [row.type, row]));
    return Object.values(TimeGateNotificationType).map((type) => {
      const row = byType.get(type);
      return {
        type,
        inAppEnabled: row?.inAppEnabled ?? true,
        pushEnabled: row?.pushEnabled ?? true,
        emailEnabled: row?.emailEnabled ?? false,
      };
    });
  }

  async updateRule(user: JwtUser, type: TimeGateNotificationType, dto: UpdateNotificationRuleDto) {
    if (!Object.values(TimeGateNotificationType).includes(type)) {
      throw new BadRequestException('Invalid notification type');
    }
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
    const row = await this.prisma.timeGateNotificationRule.upsert({
      where: {
        companyId_type: {
          companyId: user.companyId,
          type,
        },
      },
      create: {
        id: generateDocId('NRL'),
        companyId: user.companyId,
        type,
        inAppEnabled: dto.inAppEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? false,
      },
      update: {
        ...(dto.inAppEnabled !== undefined ? { inAppEnabled: dto.inAppEnabled } : {}),
        ...(dto.pushEnabled !== undefined ? { pushEnabled: dto.pushEnabled } : {}),
        ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
      },
      select: {
        type: true,
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
      },
    });
    return row;
  }

  private async resolveRule(companyId: string, type: TimeGateNotificationType) {
    const row = await this.prisma.timeGateNotificationRule.findUnique({
      where: { companyId_type: { companyId, type } },
      select: { inAppEnabled: true, pushEnabled: true, emailEnabled: true },
    });
    return {
      inAppEnabled: row?.inAppEnabled ?? true,
      pushEnabled: row?.pushEnabled ?? true,
      emailEnabled: row?.emailEnabled ?? false,
    };
  }

  async notifyPunchEvent(params: {
    companyId: string;
    branchId: string;
    employeeId: string;
    employeeName: string;
    eventType: TimeGateAttendanceEventType;
    occurredAt: Date;
    reviewRequired: boolean;
    lateAbsent?: boolean;
    reviewReason?: string;
  }) {
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const timeLabel = params.occurredAt.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dedupeBase = `${params.employeeId}:${params.eventType}:${params.occurredAt.toISOString()}`;

    const punchCopy = this.punchEventCopy(params.eventType, params.employeeName, timeLabel);

    if (employeeUserId) {
      const selfCopy = this.punchEventSelfCopy(params.eventType, timeLabel);
      await this.emit({
        companyId: params.companyId,
        userIds: [employeeUserId],
        type: selfCopy.type,
        title: selfCopy.title,
        body: selfCopy.body,
        meta: {
          employeeId: params.employeeId,
          eventType: params.eventType,
          branchId: params.branchId,
        },
        dedupeKey: `punch:${dedupeBase}`,
      });
    }

    if (params.lateAbsent) {
      const lateManagers = managerIds.filter((id) => id !== employeeUserId);
      await this.emit({
        companyId: params.companyId,
        userIds: lateManagers,
        type: TimeGateNotificationType.PUNCH_LATE,
        title: 'Retard signalé',
        body: `${params.employeeName} a pointé en retard à ${timeLabel}.`,
        meta: { employeeId: params.employeeId, branchId: params.branchId },
        dedupeKey: `late:${dedupeBase}`,
      });

      if (employeeUserId) {
        await this.emit({
          companyId: params.companyId,
          userIds: [employeeUserId],
          type: TimeGateNotificationType.PUNCH_LATE,
          title: 'Pointage en retard',
          body: `Votre arrivée à ${timeLabel} est enregistrée comme retard.`,
          meta: { employeeId: params.employeeId },
          dedupeKey: `late-emp:${dedupeBase}`,
        });
      }
    }

    if (params.reviewRequired) {
      const validators = managerIds.filter((id) => id !== employeeUserId);
      const reason = params.reviewReason ?? 'validation requise';
      await this.emit({
        companyId: params.companyId,
        userIds: validators,
        type: TimeGateNotificationType.PUNCH_REVIEW_REQUIRED,
        title: 'Pointage à valider',
        body: `${params.employeeName} — ${reason}.`,
        meta: {
          employeeId: params.employeeId,
          branchId: params.branchId,
          eventType: params.eventType,
        },
        dedupeKey: `review:${dedupeBase}`,
      });

      if (employeeUserId) {
        await this.emit({
          companyId: params.companyId,
          userIds: [employeeUserId],
          type: TimeGateNotificationType.PUNCH_REVIEW_REQUIRED,
          title: 'Pointage en attente',
          body: 'Votre pointage est en attente de validation manager.',
          meta: { employeeId: params.employeeId },
          dedupeKey: `review-emp:${dedupeBase}`,
        });
      }
    }
  }

  async notifyAutoAbsence(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    recordDate: Date;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const dateLabel = params.recordDate.toISOString().slice(0, 10);
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.ABSENCE_AUTO,
      title: 'Absence automatique',
      body: `${params.employeeName} est marqué(e) absent(e) le ${dateLabel}.`,
      meta: { employeeId: params.employeeId, recordDate: dateLabel },
      dedupeKey: `absence:${params.employeeId}:${dateLabel}`,
    });
  }

  async notifyUnclosedCheckIn(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    workDate: Date;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const dateLabel = params.workDate.toISOString().slice(0, 10);
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.UNCLOSED_CHECK_IN,
      title: 'Départ non pointé',
      body: `${params.employeeName} — arrivée sans départ le ${dateLabel}.`,
      meta: { employeeId: params.employeeId, workDate: dateLabel },
      dedupeKey: `unclosed:${params.employeeId}:${dateLabel}`,
    });
  }

  async notifyUnclosedCheckInReminder(params: {
    companyId: string;
    employeeId: string;
    employeeName: string;
    workDate: Date;
  }) {
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    if (!employeeUserId) return;

    const dateLabel = params.workDate.toISOString().slice(0, 10);
    await this.emit({
      companyId: params.companyId,
      userIds: [employeeUserId],
      type: TimeGateNotificationType.UNCLOSED_CHECK_IN_REMINDER,
      title: 'N\'oubliez pas de pointer votre départ',
      body: `Aucun départ enregistré pour le ${dateLabel}.`,
      meta: { employeeId: params.employeeId, workDate: dateLabel },
      dedupeKey: `unclosed-reminder:${params.employeeId}:${dateLabel}`,
    });
  }

  /** Rappel employé : fin de plage pause sans reprise pointée (Lot F #8). */
  async notifyBreakResumeReminder(params: {
    companyId: string;
    employeeId: string;
    workDate: Date;
  }) {
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    if (!employeeUserId) return;

    const dateLabel = params.workDate.toISOString().slice(0, 10);
    await this.emit({
      companyId: params.companyId,
      userIds: [employeeUserId],
      type: TimeGateNotificationType.BREAK_RESUME_REMINDER,
      title: 'Reprise de pause',
      body: 'Votre pause est terminée — pensez à reprendre via l’app employé.',
      meta: { employeeId: params.employeeId, workDate: dateLabel },
      dedupeKey: `break-resume-reminder:${params.employeeId}:${dateLabel}`,
    });
  }

  /** Seuil heures sup dépassé sur une journée (Lot E #5). */
  async notifyOvertimeThreshold(params: {
    companyId: string;
    employeeId: string;
    employeeName: string;
    branchId?: string;
    workDate: Date;
    overtimeMinutes: number;
    thresholdMinutes: number;
  }) {
    const dateLabel = params.workDate.toISOString().slice(0, 10);
    const hours = Math.floor(params.overtimeMinutes / 60);
    const mins = params.overtimeMinutes % 60;
    const durationLabel = mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;

    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    const dedupeKey = `overtime:${params.employeeId}:${dateLabel}`;

    if (managerIds.length > 0) {
      await this.emit({
        companyId: params.companyId,
        userIds: managerIds,
        type: TimeGateNotificationType.OVERTIME_THRESHOLD,
        title: 'Heures supplémentaires',
        body: `${params.employeeName} — ${durationLabel} HS le ${dateLabel} (seuil ${params.thresholdMinutes} min).`,
        meta: {
          employeeId: params.employeeId,
          workDate: dateLabel,
          overtimeMinutes: params.overtimeMinutes,
        },
        dedupeKey,
      });
    }

    if (employeeUserId) {
      await this.emit({
        companyId: params.companyId,
        userIds: [employeeUserId],
        type: TimeGateNotificationType.OVERTIME_THRESHOLD,
        title: 'Heures supplémentaires',
        body: `${durationLabel} au-delà de votre horaire le ${dateLabel}.`,
        meta: { employeeId: params.employeeId, workDate: dateLabel },
        dedupeKey: `${dedupeKey}:emp`,
      });
    }
  }

  async notifyOutsideWindowAttempt(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    occurredAt: Date;
    reason: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    const when = params.occurredAt.toISOString();

    if (managerIds.length > 0) {
      await this.emit({
        companyId: params.companyId,
        userIds: managerIds,
        type: TimeGateNotificationType.PUNCH_OUTSIDE_WINDOW,
        title: 'Tentative hors plage',
        body: `${params.employeeName} — tentative de pointage hors plage (${params.reason}).`,
        meta: {
          employeeId: params.employeeId,
          branchId: params.branchId ?? null,
          occurredAt: when,
        },
        dedupeKey: `outside-window:mgr:${params.employeeId}:${when}`,
      });
    }

    if (employeeUserId) {
      await this.emit({
        companyId: params.companyId,
        userIds: [employeeUserId],
        type: TimeGateNotificationType.PUNCH_OUTSIDE_WINDOW,
        title: 'Pointage hors plage',
        body: `Votre tentative de pointage est hors plage (${params.reason}).`,
        meta: { employeeId: params.employeeId, occurredAt: when },
        dedupeKey: `outside-window:emp:${params.employeeId}:${when}`,
      });
    }
  }

  async notifyBreakOverrun(params: {
    companyId: string;
    employeeId: string;
    employeeName: string;
    branchId?: string;
    workDate: Date;
    overrunMinutes: number;
  }) {
    if (params.overrunMinutes <= 0) return;
    const dateLabel = params.workDate.toISOString().slice(0, 10);
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);

    if (managerIds.length > 0) {
      await this.emit({
        companyId: params.companyId,
        userIds: managerIds,
        type: TimeGateNotificationType.BREAK_OVERRUN,
        title: 'Pause trop longue',
        body: `${params.employeeName} — dépassement pause de ${params.overrunMinutes} min le ${dateLabel}.`,
        meta: {
          employeeId: params.employeeId,
          workDate: dateLabel,
          overrunMinutes: params.overrunMinutes,
        },
        dedupeKey: `break-overrun:mgr:${params.employeeId}:${dateLabel}`,
      });
    }

    if (employeeUserId) {
      await this.emit({
        companyId: params.companyId,
        userIds: [employeeUserId],
        type: TimeGateNotificationType.BREAK_OVERRUN,
        title: 'Pause prolongée',
        body: `Votre pause dépasse la durée prévue de ${params.overrunMinutes} min (${dateLabel}).`,
        meta: {
          employeeId: params.employeeId,
          workDate: dateLabel,
          overrunMinutes: params.overrunMinutes,
        },
        dedupeKey: `break-overrun:emp:${params.employeeId}:${dateLabel}`,
      });
    }
  }

  async notifyKioskOffline(params: {
    companyId: string;
    branchId?: string;
    kioskId: string;
    kioskName: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.KIOSK_OFFLINE,
      title: 'Kiosk hors ligne',
      body: `${params.kioskName} est hors ligne (heartbeat absent).`,
      meta: { kioskId: params.kioskId, branchId: params.branchId ?? null },
      dedupeKey: `kiosk-offline:${params.kioskId}`,
    });
  }

  async notifyVerifyFailureSpike(params: {
    companyId: string;
    branchId?: string;
    kioskId: string;
    kioskName: string;
    rejectedCount: number;
    fromIso: string;
    toIso: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;
    const windowKey = `${params.fromIso.slice(0, 13)}:00`;
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.VERIFY_FAILURE_SPIKE,
      title: 'Échecs de vérification élevés',
      body: `${params.kioskName} — ${params.rejectedCount} échecs de vérification sur la dernière heure.`,
      meta: {
        kioskId: params.kioskId,
        branchId: params.branchId ?? null,
        rejectedCount: params.rejectedCount,
        from: params.fromIso,
        to: params.toIso,
      },
      dedupeKey: `verify-fail-spike:${params.kioskId}:${windowKey}`,
    });
  }

  /** Relance managers : pointages / journées encore en REVIEW_REQUIRED (Lot D #13). */
  async notifyReviewRequiredManagerReminder(params: {
    companyId: string;
    branchId?: string;
    pendingEventCount: number;
    pendingDayCount: number;
    reminderDate: string;
  }) {
    const total = params.pendingEventCount + params.pendingDayCount;
    if (total <= 0) return;

    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;

    const parts: string[] = [];
    if (params.pendingEventCount > 0) {
      parts.push(
        `${params.pendingEventCount} événement${params.pendingEventCount > 1 ? 's' : ''} de pointage`,
      );
    }
    if (params.pendingDayCount > 0) {
      parts.push(
        `${params.pendingDayCount} journée${params.pendingDayCount > 1 ? 's' : ''} timesheet`,
      );
    }

    const branchKey = params.branchId ?? 'tenant';
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.PUNCH_REVIEW_REQUIRED,
      title: 'Rappel — validations en attente',
      body: `${parts.join(' et ')} en attente depuis plus de 24 h. Merci de valider ou rejeter.`,
      meta: {
        branchId: params.branchId ?? null,
        pendingEventCount: params.pendingEventCount,
        pendingDayCount: params.pendingDayCount,
        reminder: true,
      },
      dedupeKey: `review-reminder-mgr:${params.companyId}:${branchKey}:${params.reminderDate}`,
    });
  }

  async notifySubscriptionGrace(params: { companyId: string; graceEndsAt: Date | null }) {
    const adminIds = await this.resolveAdminUserIds(params.companyId);
    if (adminIds.length === 0) return;

    const graceLabel = params.graceEndsAt
      ? params.graceEndsAt.toLocaleDateString('fr-FR')
      : 'bientôt';

    await this.emit({
      companyId: params.companyId,
      userIds: adminIds,
      type: TimeGateNotificationType.SUBSCRIPTION_GRACE,
      title: 'Abonnement — période de grâce',
      body: `Lecture seule activée. Activez une clé avant le ${graceLabel} pour éviter le blocage.`,
      dedupeKey: `subscription-grace:${params.companyId}:${graceLabel}`,
    });
  }

  async notifySubscriptionBlocked(params: { companyId: string }) {
    const adminIds = await this.resolveAdminUserIds(params.companyId);
    if (adminIds.length === 0) return;

    await this.emit({
      companyId: params.companyId,
      userIds: adminIds,
      type: TimeGateNotificationType.SUBSCRIPTION_BLOCKED,
      title: 'Abonnement bloqué',
      body: 'Votre organisation est en lecture seule bloquée. Activez une clé sur /activate pour reprendre.',
      dedupeKey: `subscription-blocked:${params.companyId}`,
    });
  }

  async notifySubscriptionQuota(params: {
    companyId: string;
    resource: 'employees' | 'kiosks';
    used: number;
    max: number;
    level: 'warning' | 'reached';
    weekKey: string;
  }) {
    const adminIds = await this.resolveAdminUserIds(params.companyId);
    if (adminIds.length === 0) return;

    const label = params.resource === 'employees' ? 'employés' : 'kiosks';
    const isReached = params.level === 'reached';

    await this.emit({
      companyId: params.companyId,
      userIds: adminIds,
      type: isReached
        ? TimeGateNotificationType.SUBSCRIPTION_QUOTA_REACHED
        : TimeGateNotificationType.SUBSCRIPTION_QUOTA_WARNING,
      title: isReached ? `Quota ${label} atteint` : `Quota ${label} — ${params.used}/${params.max}`,
      body: isReached
        ? `Limite ${label} atteinte (${params.used}/${params.max}). Passez à un plan supérieur ou activez une clé.`
        : `Vous utilisez ${params.used} sur ${params.max} ${label} (≥ 80 %). Anticipez une montée de plan.`,
      meta: {
        resource: params.resource,
        used: params.used,
        max: params.max,
        level: params.level,
      },
      dedupeKey: `quota-${params.level}:${params.companyId}:${params.resource}:${params.weekKey}`,
    });
  }

  async notifyLeaveRequestPending(params: {
    companyId: string;
    branchId?: string | null;
    employeeId: string;
    employeeName: string;
    leaveId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(
      params.companyId,
      params.branchId ?? undefined,
    );
    if (managerIds.length === 0) return;

    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.LEAVE_REQUEST_PENDING,
      title: 'Demande de congé',
      body: `${params.employeeName} — ${params.leaveType}, du ${params.fromDate} au ${params.toDate}.`,
      meta: { leaveId: params.leaveId, employeeId: params.employeeId },
      dedupeKey: `leave-pending:${params.leaveId}`,
    });
  }

  async notifyLeaveDecision(params: {
    companyId: string;
    employeeId: string;
    leaveId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    approved: boolean;
  }) {
    const employeeUserId = await this.recipients.resolveEmployeeUserId(params.employeeId);
    if (!employeeUserId) return;

    const type = params.approved
      ? TimeGateNotificationType.LEAVE_APPROVED
      : TimeGateNotificationType.LEAVE_REJECTED;

    await this.emit({
      companyId: params.companyId,
      userIds: [employeeUserId],
      type,
      title: params.approved ? 'Congé approuvé' : 'Congé refusé',
      body: params.approved
        ? `Votre demande ${params.leaveType} (${params.fromDate} → ${params.toDate}) est approuvée.`
        : `Votre demande ${params.leaveType} (${params.fromDate} → ${params.toDate}) a été refusée.`,
      meta: { leaveId: params.leaveId, employeeId: params.employeeId },
      dedupeKey: `leave-decision:${params.leaveId}:${params.approved ? 'approved' : 'rejected'}`,
    });
  }

  async notifyLeaveBalanceLow(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    leaveTypeName: string;
    year: number;
    remainingDays: number;
    dedupeDayKey: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.LEAVE_BALANCE_LOW,
      title: 'Solde congé faible',
      body: `${params.employeeName} — ${params.leaveTypeName}: ${params.remainingDays} jour(s) restant(s) (${params.year}).`,
      meta: {
        employeeId: params.employeeId,
        leaveTypeName: params.leaveTypeName,
        remainingDays: params.remainingDays,
        year: params.year,
      },
      dedupeKey: `leave-balance-low:${params.employeeId}:${params.leaveTypeName}:${params.year}:${params.dedupeDayKey}`,
    });
  }

  async notifyHrContractExpiring(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    contractId: string;
    expiresAtIso: string;
    daysLeft: number;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;
    const urgency =
      params.daysLeft <= 0
        ? "expire aujourd'hui"
        : `expire dans ${params.daysLeft} jour(s)`;
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.HR_CONTRACT_EXPIRING,
      title: 'Contrat employe a renouveler',
      body: `${params.employeeName} — contrat ${urgency} (echeance ${params.expiresAtIso}).`,
      meta: {
        employeeId: params.employeeId,
        contractId: params.contractId,
        expiresAt: params.expiresAtIso,
        daysLeft: params.daysLeft,
      },
      dedupeKey: `hr-contract-expiring:${params.contractId}:${params.daysLeft}:${params.expiresAtIso}`,
    });
  }

  async notifyHrMissingDocument(params: {
    companyId: string;
    branchId?: string;
    employeeId: string;
    employeeName: string;
    contractId: string;
    signedAtIso: string;
    weekKey: string;
  }) {
    const managerIds = await this.recipients.resolveManagers(params.companyId, params.branchId);
    if (managerIds.length === 0) return;
    await this.emit({
      companyId: params.companyId,
      userIds: managerIds,
      type: TimeGateNotificationType.HR_DOCUMENT_MISSING,
      title: 'Document contrat manquant',
      body: `${params.employeeName} — contrat signe le ${params.signedAtIso} sans piece jointe.`,
      meta: {
        employeeId: params.employeeId,
        contractId: params.contractId,
        signedAt: params.signedAtIso,
      },
      dedupeKey: `hr-document-missing:${params.contractId}:${params.weekKey}`,
    });
  }

  private async resolveAdminUserIds(companyId: string): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        companyId,
        enabled: true,
        timeGateRole: TimeGateUserRole.ADMIN,
      },
      select: { id: true },
    });
    return admins.map((u) => u.id);
  }

  private punchEventSelfCopy(
    eventType: TimeGateAttendanceEventType,
    timeLabel: string,
  ): { type: TimeGateNotificationType; title: string; body: string } {
    switch (eventType) {
      case TimeGateAttendanceEventType.CHECK_IN:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_IN,
          title: 'Arrivée enregistrée',
          body: `Votre arrivée à ${timeLabel} est enregistrée.`,
        };
      case TimeGateAttendanceEventType.CHECK_OUT:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_OUT,
          title: 'Départ enregistré',
          body: `Votre départ à ${timeLabel} est enregistré.`,
        };
      case TimeGateAttendanceEventType.BREAK_START:
      case TimeGateAttendanceEventType.BREAK_END:
        return {
          type: TimeGateNotificationType.PUNCH_BREAK,
          title: 'Pause enregistrée',
          body:
            eventType === TimeGateAttendanceEventType.BREAK_START
              ? `Début de pause enregistré à ${timeLabel}.`
              : `Fin de pause enregistrée à ${timeLabel}.`,
        };
      default:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_IN,
          title: 'Pointage enregistré',
          body: `Pointage enregistré à ${timeLabel}.`,
        };
    }
  }

  private punchEventCopy(
    eventType: TimeGateAttendanceEventType,
    employeeName: string,
    timeLabel: string,
  ): { type: TimeGateNotificationType; title: string; body: string } {
    switch (eventType) {
      case TimeGateAttendanceEventType.CHECK_IN:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_IN,
          title: 'Arrivée enregistrée',
          body: `${employeeName} — arrivée à ${timeLabel}.`,
        };
      case TimeGateAttendanceEventType.CHECK_OUT:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_OUT,
          title: 'Départ enregistré',
          body: `${employeeName} — départ à ${timeLabel}.`,
        };
      case TimeGateAttendanceEventType.BREAK_START:
      case TimeGateAttendanceEventType.BREAK_END:
        return {
          type: TimeGateNotificationType.PUNCH_BREAK,
          title: 'Pause enregistrée',
          body: `${employeeName} — ${eventType === TimeGateAttendanceEventType.BREAK_START ? 'début' : 'fin'} de pause à ${timeLabel}.`,
        };
      default:
        return {
          type: TimeGateNotificationType.PUNCH_CHECK_IN,
          title: 'Pointage enregistré',
          body: `${employeeName} — ${timeLabel}.`,
        };
    }
  }

  private toApiShape(notification: {
    id: string;
    createdAt: Date;
    companyId: string;
    userId: string;
    type: TimeGateNotificationType;
    title: string;
    body: string;
    readAt: Date | null;
    meta: Prisma.JsonValue;
  }) {
    return {
      id: notification.id,
      createdAt: notification.createdAt.toISOString(),
      companyId: notification.companyId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      readAt: notification.readAt?.toISOString() ?? null,
      meta: notification.meta,
    };
  }
}

function flattenPushMeta(meta: Prisma.InputJsonValue | undefined): Record<string, string> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    }
  }
  return out;
}
