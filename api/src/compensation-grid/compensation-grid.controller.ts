import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CompensationGridService } from './compensation-grid.service';
import { CreateCompensationGridDto } from './dto/create-compensation-grid.dto';
import { UpdateCompensationGridDto } from './dto/update-compensation-grid.dto';
import { FindCompensationGridQueryDto } from './dto/find-compensation-grid-query.dto';

@Controller('compensation-grid')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class CompensationGridController {
  constructor(private readonly service: CompensationGridService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(@Body() dto: CreateCompensationGridDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: FindCompensationGridQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(TimeGateUserRole.ADMIN)
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateCompensationGridDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
