import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStateService } from './subscription-state.service';

@Injectable()
export class SubscriptionQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionState: SubscriptionStateService,
  ) {}

  async getUsage(companyId: string) {
    const resolved = await this.subscriptionState.resolveForCompany(companyId);
    const [employeeCount, kioskCount] = await Promise.all([
      this.prisma.employee.count({ where: { companyId } }),
      this.prisma.timeGateKiosk.count({ where: { companyId } }),
    ]);

    return {
      employees: employeeCount,
      kiosks: kioskCount,
      maxEmployees: resolved?.subscription.maxEmployees ?? 0,
      maxKiosks: resolved?.subscription.maxKiosks ?? 0,
    };
  }

  async assertCanAddEmployee(companyId: string, additional = 1) {
    const resolved = await this.subscriptionState.resolveForCompany(companyId);
    if (!resolved?.isOperational) {
      throw new ForbiddenException(
        'Abonnement inactif. Activez votre abonnement pour ajouter des employes.',
      );
    }

    const count = await this.prisma.employee.count({ where: { companyId } });
    if (count + additional > resolved.subscription.maxEmployees) {
      throw new ForbiddenException(
        `Quota employes atteint (${resolved.subscription.maxEmployees}). Passez a un plan superieur ou activez une cle.`,
      );
    }
  }

  async assertCanAddKiosk(companyId: string, additional = 1) {
    const resolved = await this.subscriptionState.resolveForCompany(companyId);
    if (!resolved?.isOperational) {
      throw new ForbiddenException(
        'Abonnement inactif. Activez votre abonnement pour ajouter des kiosks.',
      );
    }

    const count = await this.prisma.timeGateKiosk.count({ where: { companyId } });
    if (count + additional > resolved.subscription.maxKiosks) {
      throw new ForbiddenException(
        `Quota kiosks atteint (${resolved.subscription.maxKiosks}). Passez a un plan superieur ou activez une cle.`,
      );
    }
  }
}
