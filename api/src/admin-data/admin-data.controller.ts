import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminDataService } from './admin-data.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDataController {
  constructor(private readonly service: AdminDataService) {}

  @Roles(Role.SUPER_ADMIN)
  @Get('system-config')
  listSystemConfig(@Query() query: PaginationQueryDto) {
    return this.service.listSystemConfigs(query);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('subscriptions')
  listSubscriptions(@Query() query: PaginationQueryDto) {
    return this.service.listSubscriptions(query);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('audit-logs')
  listAuditLogs(@Query() query: PaginationQueryDto) {
    return this.service.listAuditLogs(query);
  }
}
