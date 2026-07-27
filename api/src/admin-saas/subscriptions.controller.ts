import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminSaasService } from './admin-saas.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly service: AdminSaasService) {}

  @Roles(PLATFORM_ADMIN, TimeGateUserRole.ADMIN)
  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findSubscriptions(query, user);
  }
}
