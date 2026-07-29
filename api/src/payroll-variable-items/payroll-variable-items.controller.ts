import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PayrollVariableItemsService } from './payroll-variable-items.service';
import { CreatePayrollVariableItemDto } from './dto/create-payroll-variable-item.dto';

@Controller('payroll-runs/:runId/variable-items')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class PayrollVariableItemsController {
  constructor(private readonly service: PayrollVariableItemsService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(
    @Param('runId', DocIdPipe) runId: string,
    @Body() dto: CreatePayrollVariableItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(runId, dto, user);
  }

  @Get()
  findAll(
    @Param('runId', DocIdPipe) runId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findForRun(runId, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(
    @Param('id', DocIdPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.remove(id, user);
  }
}
