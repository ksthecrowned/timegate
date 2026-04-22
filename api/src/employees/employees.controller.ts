import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { EmployeeContractQueryDto } from './dto/employee-contract-query.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private employees: EmployeesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employees.create(dto);
  }

  @Get()
  findAll(@Query() query: EmployeeQueryDto) {
    return this.employees.findAll(query);
  }

  @Get('contracts')
  findContracts(@Query() query: EmployeeContractQueryDto) {
    return this.employees.findContracts(query);
  }

  @Roles(Role.ADMIN)
  @Post(':id/contracts')
  @UseInterceptors(FileInterceptor('contractFile', { limits: { fileSize: 20 * 1024 * 1024 } }))
  createContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmployeeContractDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.employees.createContract(id, dto, file);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employees.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.employees.remove(id);
  }
}
