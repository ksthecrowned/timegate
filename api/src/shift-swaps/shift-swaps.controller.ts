import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';
import { ReviewShiftSwapDto } from './dto/review-shift-swap.dto';
import { ShiftSwapQueryDto } from './dto/shift-swap-query.dto';
import { ShiftSwapsService } from './shift-swaps.service';

@Controller('shift-swaps')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class ShiftSwapsController {
  constructor(private readonly service: ShiftSwapsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateShiftSwapDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: ShiftSwapQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id/review')
  review(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: ReviewShiftSwapDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.review(id, dto, user);
  }
}
