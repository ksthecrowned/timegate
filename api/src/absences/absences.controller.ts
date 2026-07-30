import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SyncRecordsDto } from '../common/dto/sync-records.dto';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { AbsencesService } from './absences.service';

@Controller('absences')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class AbsencesController {
  constructor(private readonly service: AbsencesService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateAbsenceDto, @CurrentUser() user: JwtUser) {
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

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('sync')
  sync(@Body() dto: SyncRecordsDto, @CurrentUser() user: JwtUser) {
    return this.service.syncFromAttendance(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateAbsenceDto, @CurrentUser() user: JwtUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
