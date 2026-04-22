import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { SalariesService } from './salaries.service';

@Controller('salaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalariesController {
  constructor(private salaries: SalariesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSalaryDto) {
    return this.salaries.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.salaries.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSalaryDto) {
    return this.salaries.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/mark-paid')
  markPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.salaries.markPaid(id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salaries.remove(id);
  }
}
