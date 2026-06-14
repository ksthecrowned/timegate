import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityQueryDto } from './dto/city-query.dto';
import { CitiesService } from './cities.service';

@Controller('cities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CitiesController {
  constructor(private readonly service: CitiesService) {}

  @Get()
  findAll(@Query() query: CityQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.service.create(dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateCityDto) {
    return this.service.update(id, dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string) {
    return this.service.remove(id);
  }
}
