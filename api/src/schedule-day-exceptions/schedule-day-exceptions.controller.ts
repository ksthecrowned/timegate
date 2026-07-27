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
import { PLATFORM_ADMIN } from '../common/constants/platform-admin'
import { Roles } from '../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { OperationalAccessGuard } from '../common/guards/operational-access.guard'
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator'
import { DocIdPipe } from '../common/pipes/doc-id.pipe'
import { CreateScheduleDayExceptionDto } from './dto/create-schedule-day-exception.dto'
import { UpdateScheduleDayExceptionDto } from './dto/update-schedule-day-exception.dto'
import { ScheduleDayExceptionQueryDto } from './dto/schedule-day-exception-query.dto'
import { ScheduleDayExceptionsService } from './schedule-day-exceptions.service'

@Controller('schedule-day-exceptions')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class ScheduleDayExceptionsController {
  constructor(private readonly service: ScheduleDayExceptionsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateScheduleDayExceptionDto, @CurrentUser() user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Authenticated user is not linked to a company')
    }
    return this.service.create(dto, user.companyId)
  }

  @Get()
  findAll(@Query() query: ScheduleDayExceptionQueryDto, @CurrentUser() user: JwtUser) {
    const companyId =
      user.role === PLATFORM_ADMIN ? undefined : user.companyId ?? undefined
    return this.service.findAll(query, companyId)
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user)
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateScheduleDayExceptionDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user)
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user)
  }
}
