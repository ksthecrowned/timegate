import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { AiCopilotService } from './ai-copilot.service';
import { CopilotChatDto } from './dto/copilot-chat.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
export class AiCopilotController {
  constructor(private readonly copilot: AiCopilotService) {}

  @Post('copilot/chat')
  chat(@CurrentUser() user: JwtUser, @Body() dto: CopilotChatDto) {
    return this.copilot.chat(user, dto.message, dto.sessionId);
  }

  @Get('copilot/sessions/:id')
  getSession(@CurrentUser() user: JwtUser, @Param('id', DocIdPipe) id: string) {
    return this.copilot.getSession(user, id);
  }

  @Get('usage')
  usage(@CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      return {
        enabled: false,
        usedTokens: 0,
        quotaTokens: null,
        percent: null,
        unlimited: false,
      };
    }
    return this.copilot.getUsage(user.companyId);
  }

  @Get('usage/history')
  @Roles(TimeGateUserRole.ADMIN)
  history(@CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      return { daily: [], sessions: 0 };
    }
    return this.copilot.getUsageHistory(user.companyId);
  }
}
