import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { ShiftAssignmentQueryDto } from './dto/shift-assignment-query.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { ShiftAssignmentsService } from './shift-assignments.service';

@Controller('shift-assignments')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class ShiftAssignmentsController {
  constructor(private readonly service: ShiftAssignmentsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateShiftAssignmentDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: ShiftAssignmentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateShiftAssignmentDto) {
    return this.service.update(id, dto);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string) {
    return this.service.remove(id);
  }
}
