import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { FaceRecognitionLogQueryDto } from './dto/face-recognition-log-query.dto';
import { FaceRecognitionLogsService } from './face-recognition-logs.service';

@Controller('face-recognition-logs')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class FaceRecognitionLogsController {
  constructor(private logs: FaceRecognitionLogsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: FaceRecognitionLogQueryDto) {
    const companyId =
      user.role === TimeGateUserRole.SUPER_ADMIN ? undefined : user.companyId ?? undefined;
    return this.logs.findAll(query, companyId);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.SUPER_ADMIN)
  @Get('offline-sync')
  findOfflineSync(@CurrentUser() user: JwtUser, @Query() query: FaceRecognitionLogQueryDto) {
    return this.logs.findOfflineSync(user, query);
  }
}
