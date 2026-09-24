import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { ClientMissionsService } from './client-missions.service';
import {
  CreateClientMissionDto,
  FindClientMissionsQueryDto,
  UpdateClientMissionDto,
} from './dto/client-mission.dto';

@Controller('client-missions')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
@Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
export class ClientMissionsController {
  constructor(private readonly missions: ClientMissionsService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateClientMissionDto, @CurrentUser() user: JwtUser) {
    return this.missions.create(dto, user);
  }

  @Get()
  findAll(@Query() query: FindClientMissionsQueryDto, @CurrentUser() user: JwtUser) {
    return this.missions.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.missions.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateClientMissionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.missions.update(id, dto, user);
  }
}
