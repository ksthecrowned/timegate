import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLateRecordDto } from './dto/create-late-record.dto';
import { UpdateLateRecordDto } from './dto/update-late-record.dto';
import { LateRecordsService } from './late-records.service';

@Controller('late-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LateRecordsController {
  constructor(private readonly lateRecords: LateRecordsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateLateRecordDto) {
    return this.lateRecords.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.lateRecords.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLateRecordDto) {
    return this.lateRecords.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lateRecords.remove(id);
  }
}
