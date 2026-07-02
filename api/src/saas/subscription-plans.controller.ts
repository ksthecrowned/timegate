import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlansService } from './subscription-plans.service';

@Controller('plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionPlansController {
  constructor(private readonly plans: SubscriptionPlansService) {}

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.plans.findAll(includeInactive === '1' || includeInactive === 'true');
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Get(':id')
  getOne(@Param('id', DocIdPipe) id: string) {
    return this.plans.findOne(id);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.plans.create(dto);
  }

  @Roles(TimeGateUserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', DocIdPipe) id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.plans.update(id, dto);
  }
}
