import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { TimeGateNotificationType, TimeGateUserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationRuleDto } from './dto/update-notification-rule.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(@Query() query: NotificationQueryDto, @CurrentUser() user: JwtUser) {
    return this.notifications.findAll(query, user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: JwtUser) {
    return this.notifications.getUnreadCount(user);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtUser) {
    return this.notifications.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.notifications.markRead(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Get('rules')
  listRules(@CurrentUser() user: JwtUser) {
    return this.notifications.listRules(user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch('rules/:type')
  updateRule(
    @Param('type') type: TimeGateNotificationType,
    @Body() dto: UpdateNotificationRuleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notifications.updateRule(user, type, dto);
  }
}
