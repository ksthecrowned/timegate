import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateShiftLocationDto } from './dto/create-shift-location.dto';
import { ShiftLocationQueryDto } from './dto/shift-location-query.dto';
import { UpdateShiftLocationDto } from './dto/update-shift-location.dto';
import { ShiftLocationsService } from './shift-locations.service';

/** @deprecated Use branch geo fields (latitude, longitude, checkinRadius) instead. */
@Controller('shift-locations')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class ShiftLocationsController {
  constructor(private readonly service: ShiftLocationsService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateShiftLocationDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: ShiftLocationQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateShiftLocationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
