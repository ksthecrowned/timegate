import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { OrganizationsSaasService } from './organizations-saas.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsSaasController {
  constructor(private readonly organizations: OrganizationsSaasService) {}

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Patch(':id/suspension')
  setSuspension(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: SuspendOrganizationDto,
  ) {
    return this.organizations.setSuspension(id, dto.suspended);
  }
}
