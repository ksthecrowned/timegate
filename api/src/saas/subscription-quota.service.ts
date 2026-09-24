import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStateService } from './subscription-state.service';
import { CompanyCapabilitiesService } from './company-capabilities.service';

@Injectable()
export class SubscriptionQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionState: SubscriptionStateService,
    private readonly capabilities: CompanyCapabilitiesService,
  ) {}

  async getUsage(companyId: string) {
    const resolved = await this.subscriptionState.resolveForCompany(companyId);
    const [employeeCount, kioskCount, locationCount, effectiveCapabilities] =
      await Promise.all([
        this.prisma.employee.count({ where: { companyId } }),
        this.prisma.timeGateKiosk.count({ where: { companyId } }),
        this.prisma.timeGateLocation.count({ where: { companyId, isActive: true } }),
        this.capabilities.listEffective(companyId),
      ]);

    return {
      employees: employeeCount,
      kiosks: kioskCount,
      locations: locationCount,
      maxEmployees: resolved?.subscription.maxEmployees ?? 0,
      maxKiosks: resolved?.subscription.maxKiosks ?? 0,
      maxLocations: resolved?.subscription.maxLocations ?? 1,
      capabilities: effectiveCapabilities,
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

  async assertCanAddKiosk(
    companyId: string,
    additional = 1,
    opts?: { branchId?: string; locationId?: string },
  ) {
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

    if (opts?.locationId || opts?.branchId) {
      const onSite = await this.prisma.timeGateKiosk.count({
        where: {
          companyId,
          ...(opts.locationId
            ? { locationId: opts.locationId }
            : { branchId: opts.branchId }),
        },
      });
      if (onSite + additional > 1) {
        await this.capabilities.assertCapability(companyId, 'multi_kiosks');
      }
    }
  }

  async assertCanAddLocation(companyId: string, additional = 1) {
    const resolved = await this.subscriptionState.resolveForCompany(companyId);
    if (!resolved?.isOperational) {
      throw new ForbiddenException(
        'Abonnement inactif. Activez votre abonnement pour ajouter des lieux.',
      );
    }

    const count = await this.prisma.timeGateLocation.count({
      where: { companyId, isActive: true },
    });
    const next = count + additional;
    if (next > 1) {
      await this.capabilities.assertCapability(companyId, 'multi_locations');
    }
    const maxLocations = resolved.subscription.maxLocations ?? 1;
    if (next > maxLocations) {
      throw new ForbiddenException(
        `Quota lieux atteint (${maxLocations}). Passez a un plan superieur ou activez une cle.`,
      );
    }
  }
}
