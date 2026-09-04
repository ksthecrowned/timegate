import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateSalaryAdvanceDto } from './dto/create-salary-advance.dto';
import { SalaryAdvancesService } from './salary-advances.service';

@Controller('employees/:employeeId/salary-advances')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class SalaryAdvancesController {
  constructor(private readonly service: SalaryAdvancesService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(
    @Param('employeeId', DocIdPipe) employeeId: string,
    @Body() dto: CreateSalaryAdvanceDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(employeeId, dto, user);
  }

  @Get()
  findAll(
    @Param('employeeId', DocIdPipe) employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findAllForEmployee(employeeId, user);
  }

  @Patch(':id/disburse')
  @Roles(TimeGateUserRole.ADMIN)
  disburse(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.disburse(id, user);
  }

  @Patch(':id/cancel')
  @Roles(TimeGateUserRole.ADMIN)
  cancel(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.cancel(id, user);
  }
}
