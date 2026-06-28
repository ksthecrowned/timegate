import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TimeGateAttendanceEventType,
  TimeGateNotificationType,
} from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRecipientResolver } from './notification-recipient.resolver';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PushDeliveryService } from '../push/push-delivery.service';

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
    const uniqueUserIds = [...new Set(input.userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return 0;
    }

    let created = 0;
    const pushedUserIds: string[] = [];
    for (const userId of uniqueUserIds) {
      if (input.dedupeKey) {
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
      pushedUserIds.push(userId);
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
          },
        })
        .catch((err) =>
          this.logger.warn(`Push dispatch failed: ${err instanceof Error ? err.message : err}`),
        );
    }

    if (created > 0) {
      this.logger.debug(`Emitted ${created} notification(s) [${input.type}]`);
    }
    return created;
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
