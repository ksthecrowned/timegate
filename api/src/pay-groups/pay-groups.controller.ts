import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PayGroupsService } from './pay-groups.service';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';

@Controller('pay-groups')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class PayGroupsController {
  constructor(private readonly service: PayGroupsService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(@Body() dto: CreatePayGroupDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
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
    @Body() dto: UpdatePayGroupDto,
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
