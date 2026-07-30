import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { BulkCreateEmployeesDto } from './dto/bulk-create-employees.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeContractQueryDto } from './dto/employee-contract-query.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { UpdateEmployeeContractDto } from './dto/update-employee-contract.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { SetKioskPinDto } from './dto/set-kiosk-pin.dto';
import { SetNfcBadgeDto } from './dto/set-nfc-badge.dto';
import { EmployeesService } from './employees.service';
import { LeaveBalancesService } from '../leaves/leave-balances.service';
import {
  LeaveBalanceQueryDto,
  UpsertLeaveAllocationDto,
} from '../leaves/dto/leave-balance-query.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class EmployeesController {
  constructor(
    private employees: EmployeesService,
    private leaveBalances: LeaveBalancesService,
  ) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtUser) {
    return this.employees.create(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateEmployeesDto, @CurrentUser() user: JwtUser) {
    return this.employees.bulkCreate(dto.employees, user);
  }

  @Get()
  findAll(@Query() query: EmployeeQueryDto, @CurrentUser() user: JwtUser) {
    return this.employees.findAll(query, user);
  }

  @Get('contracts')
  findContracts(@Query() query: EmployeeContractQueryDto, @CurrentUser() user: JwtUser) {
    return this.employees.findContracts(query, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post(':id/contracts')
  @UseInterceptors(FileInterceptor('contractFile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  createContract(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: CreateEmployeeContractDto,
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.employees.createContract(id, dto, user, file);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id/contracts/:contractId')
  @UseInterceptors(FileInterceptor('contractFile', { limits: { fileSize: 10 * 1024 * 1024 } }))
  updateContract(
    @Param('id', DocIdPipe) id: string,
    @Param('contractId', DocIdPipe) contractId: string,
    @Body() dto: UpdateEmployeeContractDto,
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.employees.updateContract(id, contractId, dto, user, file);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id/contracts/:contractId')
  removeContract(
    @Param('id', DocIdPipe) id: string,
    @Param('contractId', DocIdPipe) contractId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.employees.removeContract(id, contractId, user);
  }

  @Get(':id/leave-balances')
  getLeaveBalances(
    @Param('id', DocIdPipe) id: string,
    @Query() query: LeaveBalanceQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.employees.findOne(id, user).then(() =>
      this.leaveBalances.getEmployeeBalances(id, query.year),
    );
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post(':id/leave-allocations')
  upsertLeaveAllocation(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpsertLeaveAllocationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.employees.findOne(id, user).then(() =>
      this.leaveBalances.upsertAllocation(id, dto.leaveTypeId, dto.year, dto.allocatedDays),
    );
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id/kiosk-pin')
  setKioskPin(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: SetKioskPinDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.employees.setKioskPin(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id/nfc-badge')
  setNfcBadge(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: SetNfcBadgeDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.employees.setNfcBadge(id, dto, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.employees.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: JwtUser) {
    return this.employees.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.employees.remove(id, user);
  }
}
