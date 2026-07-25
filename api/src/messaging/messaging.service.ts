import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TimeGateNotificationType, TimeGateUserRole } from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationRecipientResolver } from '../notifications/notification-recipient.resolver';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagingQueryDto } from './dto/messaging-query.dto';

type SenderShape = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  timeGateRole: TimeGateUserRole | null;
};

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly recipients: NotificationRecipientResolver,
  ) {}

  async listForEmployee(user: JwtUser, query: MessagingQueryDto) {
    this.requireEmployee(user);
    return this.listConversations(
      { companyId: user.companyId!, employeeId: user.employeeId! },
      user.sub,
      query,
    );
  }

  async listForManager(user: JwtUser, query: MessagingQueryDto) {
    this.requireManager(user);
    return this.listConversations({ companyId: user.companyId! }, user.sub, query);
  }

  async getForEmployee(id: string, user: JwtUser) {
    this.requireEmployee(user);
    const conversation = await this.loadConversation(id, user.companyId!);
    if (conversation.employeeId !== user.employeeId) {
      throw new ForbiddenException('Conversation not accessible');
    }
    await this.markRead(id, user.sub);
    return this.toDetail(conversation, user.sub);
  }

  async getForManager(id: string, user: JwtUser) {
    this.requireManager(user);
    const conversation = await this.loadConversation(id, user.companyId!);
    await this.markRead(id, user.sub);
    return this.toDetail(conversation, user.sub);
  }

  async createAsEmployee(dto: CreateConversationDto, user: JwtUser) {
    this.requireEmployee(user);
    return this.createConversation({
      companyId: user.companyId!,
      employeeId: user.employeeId!,
      subject: dto.subject,
      body: dto.body,
      senderUserId: user.sub,
      notifyManagers: true,
    });
  }

  async createAsManager(dto: CreateConversationDto, user: JwtUser) {
    this.requireManager(user);
    if (!dto.employeeId?.trim()) {
      throw new BadRequestException('employeeId is required');
    }
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId: user.companyId! },
      select: { id: true, userId: true, branchId: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return this.createConversation({
      companyId: user.companyId!,
      employeeId: employee.id,
      subject: dto.subject,
      body: dto.body,
      senderUserId: user.sub,
      notifyEmployeeUserId: employee.userId,
      branchId: employee.branchId ?? undefined,
    });
  }

  async replyAsEmployee(id: string, dto: CreateMessageDto, user: JwtUser) {
    this.requireEmployee(user);
    const conversation = await this.loadConversation(id, user.companyId!);
    if (conversation.employeeId !== user.employeeId) {
      throw new ForbiddenException('Conversation not accessible');
    }
    return this.appendMessage(conversation, dto.body, user.sub, {
      notifyManagers: true,
      branchId: conversation.employee.branchId ?? undefined,
    });
  }

  async replyAsManager(id: string, dto: CreateMessageDto, user: JwtUser) {
    this.requireManager(user);
    const conversation = await this.loadConversation(id, user.companyId!);
    return this.appendMessage(conversation, dto.body, user.sub, {
      notifyEmployeeUserId: conversation.employee.userId,
    });
  }

  async markReadForUser(id: string, user: JwtUser) {
    if (!user.companyId) throw new ForbiddenException('Company required');
    const conversation = await this.prisma.timeGateConversation.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true, employeeId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (
      user.role === TimeGateUserRole.EMPLOYEE &&
      conversation.employeeId !== user.employeeId
    ) {
      throw new ForbiddenException('Conversation not accessible');
    }
    await this.markRead(id, user.sub);
    return { ok: true };
  }

  private async listConversations(
    where: { companyId: string; employeeId?: string },
    readerUserId: string,
    query: MessagingQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.timeGateConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userId: true,
            },
          },
          reads: {
            where: { userId: readerUserId },
            select: { lastReadAt: true },
            take: 1,
          },
        },
      }),
      this.prisma.timeGateConversation.count({ where }),
    ]);

    return {
      data: rows.map((row) => {
        const lastReadAt = row.reads[0]?.lastReadAt ?? null;
        const unread =
          !lastReadAt || row.lastMessageAt.getTime() > lastReadAt.getTime();
        return {
          id: row.id,
          subject: row.subject,
          lastMessageAt: row.lastMessageAt.toISOString(),
          lastMessagePreview: row.lastMessagePreview,
          createdAt: row.createdAt.toISOString(),
          unread,
          employee: {
            id: row.employee.id,
            firstName: row.employee.firstName,
            lastName: row.employee.lastName,
          },
        };
      }),
      meta: { page, limit, total },
    };
  }

  private async createConversation(params: {
    companyId: string;
    employeeId: string;
    subject: string;
    body: string;
    senderUserId: string;
    notifyManagers?: boolean;
    notifyEmployeeUserId?: string | null;
    branchId?: string;
  }) {
    const now = new Date();
    const conversationId = generateDocId('conv');
    const messageId = generateDocId('msg');
    const preview = truncate(params.body, 240);

    const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeGateConversation.create({
        data: {
          id: conversationId,
          companyId: params.companyId,
          employeeId: params.employeeId,
          subject: params.subject.trim(),
          lastMessageAt: now,
          lastMessagePreview: preview,
          createdByUserId: params.senderUserId,
          messages: {
            create: {
              id: messageId,
              senderUserId: params.senderUserId,
              body: params.body.trim(),
              createdAt: now,
            },
          },
          reads: {
            create: {
              id: generateDocId('cread'),
              userId: params.senderUserId,
              lastReadAt: now,
            },
          },
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userId: true,
              branchId: true,
            },
          },
          messages: {
            include: { sender: senderSelect },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      return created;
    });

    await this.notifyNewMessage({
      companyId: params.companyId,
      conversationId: conversation.id,
      subject: conversation.subject,
      bodyPreview: preview,
      senderUserId: params.senderUserId,
      notifyManagers: params.notifyManagers,
      notifyEmployeeUserId: params.notifyEmployeeUserId,
      branchId: params.branchId ?? conversation.employee.branchId ?? undefined,
    });

    return this.toDetail(conversation, params.senderUserId);
  }

  private async appendMessage(
    conversation: Awaited<ReturnType<MessagingService['loadConversation']>>,
    body: string,
    senderUserId: string,
    notify: {
      notifyManagers?: boolean;
      notifyEmployeeUserId?: string | null;
      branchId?: string;
    },
  ) {
    const now = new Date();
    const preview = truncate(body, 240);
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeGateMessage.create({
        data: {
          id: generateDocId('msg'),
          conversationId: conversation.id,
          senderUserId,
          body: body.trim(),
          createdAt: now,
        },
        include: { sender: senderSelect },
      });
      await tx.timeGateConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          lastMessagePreview: preview,
        },
      });
      await tx.timeGateConversationRead.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: senderUserId,
          },
        },
        create: {
          id: generateDocId('cread'),
          conversationId: conversation.id,
          userId: senderUserId,
          lastReadAt: now,
        },
        update: { lastReadAt: now },
      });
      return created;
    });

    await this.notifyNewMessage({
      companyId: conversation.companyId,
      conversationId: conversation.id,
      subject: conversation.subject,
      bodyPreview: preview,
      senderUserId,
      notifyManagers: notify.notifyManagers,
      notifyEmployeeUserId: notify.notifyEmployeeUserId,
      branchId: notify.branchId,
    });

    return this.toMessageShape(message);
  }

  private async loadConversation(id: string, companyId: string) {
    const conversation = await this.prisma.timeGateConversation.findFirst({
      where: { id, companyId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
            branchId: true,
          },
        },
        messages: {
          include: { sender: senderSelect },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private async markRead(conversationId: string, userId: string) {
    const now = new Date();
    await this.prisma.timeGateConversationRead.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: {
        id: generateDocId('cread'),
        conversationId,
        userId,
        lastReadAt: now,
      },
      update: { lastReadAt: now },
    });
  }

  private async notifyNewMessage(params: {
    companyId: string;
    conversationId: string;
    subject: string;
    bodyPreview: string;
    senderUserId: string;
    notifyManagers?: boolean;
    notifyEmployeeUserId?: string | null;
    branchId?: string;
  }) {
    const userIds = new Set<string>();
    if (params.notifyManagers) {
      const managers = await this.recipients.resolveManagers(
        params.companyId,
        params.branchId,
      );
      for (const id of managers) {
        if (id !== params.senderUserId) userIds.add(id);
      }
    }
    if (params.notifyEmployeeUserId && params.notifyEmployeeUserId !== params.senderUserId) {
      userIds.add(params.notifyEmployeeUserId);
    }
    if (userIds.size === 0) return;

    await this.notifications.emit({
      companyId: params.companyId,
      userIds: [...userIds],
      type: TimeGateNotificationType.MESSAGE_RECEIVED,
      title: 'Nouveau message',
      body: `${params.subject} — ${params.bodyPreview}`,
      meta: {
        conversationId: params.conversationId,
        href: `/messages/${params.conversationId}`,
      },
    });
  }

  private toDetail(
    conversation: {
      id: string;
      subject: string;
      lastMessageAt: Date;
      lastMessagePreview: string | null;
      createdAt: Date;
      employee: {
        id: string;
        firstName: string | null;
        lastName: string | null;
      };
      messages: Array<{
        id: string;
        body: string;
        createdAt: Date;
        senderUserId: string;
        sender: SenderShape;
      }>;
    },
    readerUserId: string,
  ) {
    return {
      id: conversation.id,
      subject: conversation.subject,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      lastMessagePreview: conversation.lastMessagePreview,
      createdAt: conversation.createdAt.toISOString(),
      employee: {
        id: conversation.employee.id,
        firstName: conversation.employee.firstName,
        lastName: conversation.employee.lastName,
      },
      messages: conversation.messages.map((m) => this.toMessageShape(m)),
      viewerUserId: readerUserId,
    };
  }

  private toMessageShape(message: {
    id: string;
    body: string;
    createdAt: Date;
    senderUserId: string;
    sender: SenderShape;
  }) {
    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      senderUserId: message.senderUserId,
      sender: {
        id: message.sender.id,
        firstName: message.sender.firstName,
        lastName: message.sender.lastName,
        role: message.sender.timeGateRole,
      },
    };
  }

  private requireEmployee(user: JwtUser) {
    if (!user.companyId || !user.employeeId || user.role !== TimeGateUserRole.EMPLOYEE) {
      throw new ForbiddenException('Employee portal access required');
    }
  }

  private requireManager(user: JwtUser) {
    if (
      !user.companyId ||
      (user.role !== TimeGateUserRole.ADMIN && user.role !== TimeGateUserRole.MANAGER)
    ) {
      throw new ForbiddenException('Manager access required');
    }
  }
}

const senderSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    timeGateRole: true,
  },
} as const;

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
