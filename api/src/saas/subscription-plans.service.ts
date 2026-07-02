import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return this.prisma.timeGateSubscriptionPlan.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.timeGateSubscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findByCode(code: string) {
    return this.prisma.timeGateSubscriptionPlan.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async create(dto: CreateSubscriptionPlanDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.timeGateSubscriptionPlan.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Plan code already exists');
    }
    return this.prisma.timeGateSubscriptionPlan.create({
      data: {
        id: generateDocId('PLN'),
        code,
        label: dto.label.trim(),
        maxEmployees: dto.maxEmployees,
        maxKiosks: dto.maxKiosks,
        durationDays: dto.durationDays ?? null,
        features: (dto.features as Prisma.InputJsonValue | undefined) ?? undefined,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto) {
    await this.findOne(id);
    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      const conflict = await this.prisma.timeGateSubscriptionPlan.findFirst({
        where: { code, NOT: { id } },
      });
      if (conflict) throw new BadRequestException('Plan code already exists');
    }
    return this.prisma.timeGateSubscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.maxEmployees !== undefined ? { maxEmployees: dto.maxEmployees } : {}),
        ...(dto.maxKiosks !== undefined ? { maxKiosks: dto.maxKiosks } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
        ...(dto.features !== undefined
          ? { features: dto.features as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }
}
