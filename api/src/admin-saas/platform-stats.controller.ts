import { Controller, Get, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminSaasService } from './admin-saas.service';

@Controller('admin-saas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformStatsController {
  constructor(private readonly adminSaas: AdminSaasService) {}

  @Get('platform-stats')
  @Roles(PLATFORM_ADMIN)
  getPlatformStats() {
    return this.adminSaas.getPlatformStats();
  }
}
