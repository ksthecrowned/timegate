import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { EmployeeCompensationService } from './employee-compensation.service';
import { CreateEmployeeCompensationItemDto } from './dto/create-employee-compensation-item.dto';
import { UpdateEmployeeCompensationItemDto } from './dto/update-employee-compensation-item.dto';

@Controller('employees/:employeeId/compensation-items')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class EmployeeCompensationController {
  constructor(private readonly service: EmployeeCompensationService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeCompensationItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(employeeId, dto, user);
  }

  @Get()
  findAll(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findAllForEmployee(employeeId, user);
  }

  @Patch(':id')
  @Roles(TimeGateUserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeCompensationItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
