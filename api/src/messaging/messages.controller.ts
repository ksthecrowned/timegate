import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagingQueryDto } from './dto/messaging-query.dto';
import { MessagingService } from './messaging.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
export class MessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: MessagingQueryDto) {
    return this.messaging.listForManager(user, query);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateConversationDto) {
    return this.messaging.createAsManager(dto, user);
  }

  @Get(':id')
  get(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.messaging.getForManager(id, user);
  }

  @Post(':id/messages')
  reply(
    @Param('id', DocIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messaging.replyAsManager(id, dto, user);
  }

  @Post(':id/read')
  markRead(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.messaging.markReadForUser(id, user);
  }
}
