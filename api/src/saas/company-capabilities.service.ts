import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStateService } from './subscription-state.service';
import {
  parseCapabilitiesJson,
  type TimeGateCapability,
} from './capabilities.constants';

@Injectable()
export class CompanyCapabilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionState: SubscriptionStateService,
  ) {}

  async listEffective(companyId: string): Promise<string[]> {
    const [resolved, company] = await Promise.all([
      this.subscriptionState.resolveForCompany(companyId),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { capabilitiesOptOut: true },
      }),
    ]);
    const fromSub = parseCapabilitiesJson(resolved?.subscription.capabilities);
    const optOut = new Set(parseCapabilitiesJson(company?.capabilitiesOptOut));
    return fromSub.filter((code) => !optOut.has(code));
  }

  async hasCapability(companyId: string, capability: TimeGateCapability): Promise<boolean> {
    const effective = await this.listEffective(companyId);
    return effective.includes(capability);
  }

  async assertCapability(companyId: string, capability: TimeGateCapability) {
    const ok = await this.hasCapability(companyId, capability);
    if (!ok) {
      throw new ForbiddenException(
        `Capacite requise non activee: ${capability}. Passez a un plan superieur ou activez cette option.`,
      );
    }
  }
}
