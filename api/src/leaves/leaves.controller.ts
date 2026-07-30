import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { LeavesService } from './leaves.service';

@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
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
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateLeaveDto, @CurrentUser() user: JwtUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
