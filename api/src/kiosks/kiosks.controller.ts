import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateKioskDto } from './dto/create-kiosk.dto';
import { KioskHeartbeatDto } from './dto/kiosk-heartbeat.dto';
import { KioskQueryDto } from './dto/kiosk-query.dto';
import { UpdateKioskDto } from './dto/update-kiosk.dto';
import { KiosksService } from './kiosks.service';

@Controller('kiosks')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class KiosksController {
  constructor(private kiosks: KiosksService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateKioskDto, @CurrentUser() user: JwtUser) {
    return this.kiosks.create(dto, user);
  }

  @Get()
  findAll(@Query() query: KioskQueryDto, @CurrentUser() user: JwtUser) {
    return this.kiosks.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.kiosks.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateKioskDto, @CurrentUser() user: JwtUser) {
    return this.kiosks.update(id, dto, user);
  }

  @Patch(':id/heartbeat')
  heartbeat(@Param('id', DocIdPipe) id: string, @Body() dto: KioskHeartbeatDto, @CurrentUser() user: JwtUser) {
    return this.kiosks.heartbeat(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post(':id/reset-access')
  resetAccess(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.kiosks.resetAccess(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.kiosks.remove(id, user);
  }
}
