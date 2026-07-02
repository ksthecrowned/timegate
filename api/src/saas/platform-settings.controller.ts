import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('platform-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Get()
  get() {
    return this.settings.getSettings();
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Patch()
  update(@Body() dto: UpdatePlatformSettingsDto) {
    return this.settings.updateSettings(dto);
  }
}
