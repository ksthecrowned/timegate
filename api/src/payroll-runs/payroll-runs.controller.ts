import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { FindPayrollRunsQueryDto } from './dto/find-payroll-runs-query.dto';
import { PayrollRunsService } from './payroll-runs.service';

@Controller('payroll-runs')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class PayrollRunsController {
  constructor(private readonly service: PayrollRunsService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePayrollRunDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: FindPayrollRunsQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Get(':id/lines')
  findLines(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findLines(id, user);
  }

  @Get(':id/export')
  exportCsv(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.exportCsv(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id/lock')
  lock(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.lock(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id/mark-paid')
  markPaid(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.markPaid(id, user);
  }
}
