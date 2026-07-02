import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { requireCompanyId } from '../common/utils/company-scope.util';
import { TrustedDevicesService } from './trusted-devices.service';
import { UpdateTrustedDeviceDto } from './dto/update-trusted-device.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrustedDevicesController {
  constructor(private readonly trustedDevices: TrustedDevicesService) {}

  @Get('trusted-devices/pending')
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  listPending(@CurrentUser() user: JwtUser) {
    return this.trustedDevices.listPending(requireCompanyId(user));
  }

  @Get('employees/:employeeId/trusted-devices')
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  listForEmployee(
    @Param('employeeId', DocIdPipe) employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.trustedDevices.listForEmployee(employeeId, requireCompanyId(user));
  }

  @Patch('employees/:employeeId/trusted-devices/:deviceId')
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  updateStatus(
    @Param('employeeId', DocIdPipe) _employeeId: string,
    @Param('deviceId', DocIdPipe) deviceId: string,
    @Body() dto: UpdateTrustedDeviceDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.trustedDevices.updateStatus(deviceId, requireCompanyId(user), dto.status);
  }

  @Post('employees/:employeeId/portal-user')
  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  ensurePortalUser(
    @Param('employeeId', DocIdPipe) employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.trustedDevices.ensurePortalUser(employeeId, requireCompanyId(user));
  }
}
