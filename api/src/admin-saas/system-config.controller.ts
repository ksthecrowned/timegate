import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AdminSaasService } from './admin-saas.service';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemConfigController {
  constructor(private readonly service: AdminSaasService) {}

  @Roles(TimeGateUserRole.SUPER_ADMIN, TimeGateUserRole.ADMIN)
  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findSystemConfigs(query, user);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN, TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateSystemConfig(id, dto, user);
  }
}
