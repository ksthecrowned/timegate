import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { TimeGateUserRole } from '@prisma/client'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { OperationalAccessGuard } from '../common/guards/operational-access.guard'
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator'
import { DocIdPipe } from '../common/pipes/doc-id.pipe'
import { PaginationQueryDto } from '../common/dto/pagination-query.dto'
import { CreateEmploymentTypeDto } from './dto/create-employment-type.dto'
import { UpdateEmploymentTypeDto } from './dto/update-employment-type.dto'
import { EmploymentTypesService } from './employment-types.service'

@Controller('employment-types')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class EmploymentTypesController {
  constructor(private readonly service: EmploymentTypesService) {}

  @Roles(TimeGateUserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEmploymentTypeDto, @CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Authenticated user is not linked to a company')
    }
    return this.service.create(dto, user.companyId)
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
    const companyId =
      user.role === TimeGateUserRole.SUPER_ADMIN ? undefined : user.companyId ?? undefined
    return this.service.findAll(query, companyId)
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user)
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateEmploymentTypeDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user)
  }
}
