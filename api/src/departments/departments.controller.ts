import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Authenticated user is not linked to a company');
    }
    return this.service.create(dto, user.companyId);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
    const companyId =
      user.role === PLATFORM_ADMIN ? undefined : user.companyId ?? undefined;
    return this.service.findAll(query, companyId);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: JwtUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
