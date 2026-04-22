import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateWorkDayDto } from './dto/create-work-day.dto';
import { UpdateWorkDayDto } from './dto/update-work-day.dto';
import { WorkDaysService } from './work-days.service';

@Controller('work-days')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkDaysController {
  constructor(private readonly service: WorkDaysService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateWorkDayDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkDayDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
