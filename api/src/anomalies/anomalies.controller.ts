import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { AnomaliesService } from './anomalies.service';
import { FindAnomaliesQueryDto, ResolveAnomalyDto } from './dto/anomaly.dto';

@Controller('anomalies')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
export class AnomaliesController {
  constructor(private readonly anomalies: AnomaliesService) {}

  @Get()
  findAll(@Query() query: FindAnomaliesQueryDto, @CurrentUser() user: JwtUser) {
    return this.anomalies.findAll(query, user);
  }

  @Get(':kind/:id')
  findOne(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.anomalies.findOne(`${kind}:${id}`, user);
  }

  @Post(':kind/:id/resolve')
  resolve(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() dto: ResolveAnomalyDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.anomalies.resolve(`${kind}:${id}`, dto, user);
  }
}
