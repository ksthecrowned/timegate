import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CloudflareR2Service,
  ) {}

  async getMyCompany(user: JwtUser) {
    const company = await this.requireCompany(user);
    return this.toApiShape(company);
  }

  async updateMyCompany(user: JwtUser, dto: UpdateCompanyDto) {
    const company = await this.requireCompany(user);
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.abbr !== undefined ? { abbr: dto.abbr } : {}),
        ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.website !== undefined ? { website: dto.website || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
      },
    });
    return this.toApiShape(updated);
  }

  async uploadLogo(user: JwtUser, file: Express.Multer.File) {
    const company = await this.requireCompany(user);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Logo file is required');
    }

    const logoUrl = await this.storage.uploadCompanyLogo({
      organizationId: company.id,
      contentType: file.mimetype,
      buffer: file.buffer,
    });

    if (!logoUrl) {
      throw new BadRequestException(
        'Stockage cloud indisponible. Définissez logoUrl manuellement ou configurez Cloudflare R2.',
      );
    }

    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: { logoUrl },
    });
    return this.toApiShape(updated);
  }

  private async requireCompany(user: JwtUser) {
    if (!user.companyId) {
      throw new ForbiddenException('Authenticated user is not linked to a company');
    }
    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  private toApiShape(company: {
    id: string;
    name: string | null;
    sku: string | null;
    abbr: string | null;
    timeZone: string | null;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: company.id,
      name: company.name,
      sku: company.sku,
      abbr: company.abbr,
      timeZone: company.timeZone,
      logoUrl: company.logoUrl,
      phone: company.phone,
      email: company.email,
      website: company.website,
      address: company.address,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }
}
