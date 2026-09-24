import {
  BadRequestException,
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
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { ArchiveLocationDto } from './dto/archive-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Authenticated user is not linked to a company');
    }
    return this.locations.create(dto, user.companyId);
  }

  @Get()
  findAll(@Query() query: LocationQueryDto, @CurrentUser() user: JwtUser) {
    return this.locations.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.locations.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.locations.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post(':id/archive')
  archive(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: ArchiveLocationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.locations.archive(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post(':id/restore')
  restore(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.locations.restore(id, user);
  }
}
