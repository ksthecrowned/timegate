import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CountriesService } from './countries.service';

@Controller('countries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CountriesController {
  constructor(private readonly service: CountriesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCountryDto) {
    return this.service.create(dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateCountryDto) {
    return this.service.update(id, dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string) {
    return this.service.remove(id);
  }
}
