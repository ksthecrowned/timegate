import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { EmployeePortalGuard } from '../employee-portal/guards/employee-portal.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagingQueryDto } from './dto/messaging-query.dto';
import { MessagingService } from './messaging.service';

@Controller('employee/messages')
@UseGuards(JwtAuthGuard, EmployeePortalGuard)
export class EmployeeMessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: MessagingQueryDto) {
    return this.messaging.listForEmployee(user, query);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateConversationDto) {
    return this.messaging.createAsEmployee(dto, user);
  }

  @Get(':id')
  get(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.messaging.getForEmployee(id, user);
  }

  @Post(':id/messages')
  reply(
    @Param('id', DocIdPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messaging.replyAsEmployee(id, dto, user);
  }

  @Post(':id/read')
  markRead(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.messaging.markReadForUser(id, user);
  }
}
