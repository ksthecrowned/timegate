import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsSaasService {
  constructor(private readonly prisma: PrismaService) {}

  async setSuspension(companyId: string, suspended: boolean) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Organization not found');

    return this.prisma.company.update({
      where: { id: companyId },
      data: { suspendedAt: suspended ? new Date() : null },
      select: {
        id: true,
        name: true,
        sku: true,
        suspendedAt: true,
      },
    });
  }
}
