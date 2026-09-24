import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  KioskStatus,
  Prisma,
  TimeGateClientMissionStatus,
  TimeGateLocationType,
  TimeGateUserRole,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import {
  buildKioskQrChallengePayload,
  generateKioskQrChallengeSecret,
} from '../common/utils/kiosk-qr-challenge.util';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyCapabilitiesService } from '../saas/company-capabilities.service';
import { SubscriptionQuotaService } from '../saas/subscription-quota.service';
import {
  CreateClientMissionDto,
  FindClientMissionsQueryDto,
  UpdateClientMissionDto,
} from './dto/client-mission.dto';

@Injectable()
export class ClientMissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilities: CompanyCapabilitiesService,
    private readonly quotas: SubscriptionQuotaService,
  ) {}

  async create(dto: CreateClientMissionDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);
    await this.capabilities.assertCapability(companyId, 'client_missions');

    const branch = await this.resolveBranch(companyId, dto.branchId);
    const location = await this.resolveOrCreateLocation(companyId, dto);

    await this.quotas.assertCanAddKiosk(companyId, 1, {
      branchId: branch.id,
      locationId: location.id,
    });

    const slug = this.generateSlug();
    const kioskId = generateDocId('KSK');
    const missionId = generateDocId('MSN');
    const status =
      dto.status === 'DRAFT'
        ? TimeGateClientMissionStatus.DRAFT
        : TimeGateClientMissionStatus.ACTIVE;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.timeGateKiosk.create({
        data: {
          id: kioskId,
          kioskName: `ClientQR-${slug}`,
          companyId,
          branchId: branch.id,
          locationId: location.id,
          status: KioskStatus.ONLINE,
          isActive: status === TimeGateClientMissionStatus.ACTIVE,
          faceEnabled: false,
          nfcEnabled: false,
          qrEnabled: true,
          qrChallengeSecret: generateKioskQrChallengeSecret(),
          lastSeenAt: new Date(),
        },
      });

      return tx.timeGateClientMission.create({
        data: {
          id: missionId,
          companyId,
          title: dto.title.trim(),
          status,
          locationId: location.id,
          branchId: branch.id,
          kioskId,
          publicSlug: slug,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        },
        include: this.includeShape(),
      });
    });

    return this.toApiShape(created);
  }

  async findAll(query: FindClientMissionsQueryDto, user: JwtUser) {
    const companyId = this.resolveCompanyFilter(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TimeGateClientMissionWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.timeGateClientMission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.includeShape(),
      }),
      this.prisma.timeGateClientMission.count({ where }),
    ]);
    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const row = await this.prisma.timeGateClientMission.findUnique({
      where: { id },
      include: this.includeShape(),
    });
    if (!row) throw new NotFoundException('Mission introuvable');
    this.assertCompanyAccess(user, row.companyId);
    return this.toApiShape(row);
  }

  async update(id: string, dto: UpdateClientMissionDto, user: JwtUser) {
    const row = await this.prisma.timeGateClientMission.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Mission introuvable');
    this.assertCompanyAccess(user, row.companyId);
    await this.capabilities.assertCapability(row.companyId, 'client_missions');

    const nextStatus = dto.status ?? row.status;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status && dto.status !== row.status) {
        await tx.timeGateKiosk.update({
          where: { id: row.kioskId },
          data: {
            isActive: nextStatus === TimeGateClientMissionStatus.ACTIVE,
            status:
              nextStatus === TimeGateClientMissionStatus.ACTIVE
                ? KioskStatus.ONLINE
                : KioskStatus.OFFLINE,
          },
        });
      }
      return tx.timeGateClientMission.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.startsAt !== undefined
            ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }
            : {}),
          ...(dto.endsAt !== undefined
            ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }
            : {}),
        },
        include: this.includeShape(),
      });
    });
    return this.toApiShape(updated);
  }

  /** Public: mission meta for display page. */
  async getPublicMeta(slug: string) {
    const row = await this.requireActiveMission(slug);
    return {
      slug: row.publicSlug,
      title: row.title,
      clientLabel: row.location.clientLabel ?? row.location.name,
      locationName: row.location.name,
      companyName: row.company.name,
    };
  }

  async createPublicQrChallenge(slug: string) {
    const row = await this.requireActiveMission(slug);
    const kiosk = row.kiosk;
    if (!kiosk.qrChallengeSecret || !kiosk.qrEnabled || !kiosk.isActive) {
      throw new BadRequestException('QR indisponible pour cette mission');
    }

    const built = buildKioskQrChallengePayload(kiosk.id, kiosk.qrChallengeSecret);
    const id = generateDocId('QRC');
    const payloadHash = createHash('sha256').update(built.payload).digest('hex');
    await this.prisma.timeGateQrChallenge.create({
      data: {
        id,
        kioskId: kiosk.id,
        nonce: built.nonce,
        slot: built.slot,
        payloadHash,
        expiresAt: built.expiresAt,
      },
    });
    await this.prisma.timeGateKiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
    });
    return {
      id,
      payload: built.payload,
      expiresAt: built.expiresAt.toISOString(),
    };
  }

  async getPublicQrChallengeResult(slug: string, challengeId: string) {
    const row = await this.requireActiveMission(slug);
    const challenge = await this.prisma.timeGateQrChallenge.findFirst({
      where: { id: challengeId, kioskId: row.kioskId },
      select: {
        id: true,
        expiresAt: true,
        redeemedAt: true,
        resultJson: true,
      },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (challenge.redeemedAt) {
      return { status: 'REDEEMED' as const, result: challenge.resultJson ?? null };
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      return { status: 'EXPIRED' as const, result: null };
    }
    return { status: 'PENDING' as const, result: null };
  }

  private async requireActiveMission(slug: string) {
    const row = await this.prisma.timeGateClientMission.findUnique({
      where: { publicSlug: slug },
      include: {
        location: { select: { id: true, name: true, clientLabel: true } },
        company: { select: { id: true, name: true } },
        kiosk: {
          select: {
            id: true,
            qrEnabled: true,
            qrChallengeSecret: true,
            isActive: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Lien mission invalide');
    if (row.status !== TimeGateClientMissionStatus.ACTIVE) {
      throw new ForbiddenException('Cette mission n\'est pas active');
    }
    const now = Date.now();
    if (row.startsAt && row.startsAt.getTime() > now) {
      throw new ForbiddenException('Mission pas encore ouverte');
    }
    if (row.endsAt && row.endsAt.getTime() < now) {
      throw new ForbiddenException('Mission expiree');
    }
    return row;
  }

  private async resolveBranch(companyId: string, branchId?: string) {
    if (branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch || branch.companyId !== companyId) {
        throw new NotFoundException('Branch not found');
      }
      return branch;
    }
    const head = await this.prisma.branch.findFirst({
      where: { companyId, isHeadOffice: true, isActive: true },
    });
    if (head) return head;
    const any = await this.prisma.branch.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!any) throw new BadRequestException('Aucune branche disponible');
    return any;
  }

  private async resolveOrCreateLocation(companyId: string, dto: CreateClientMissionDto) {
    if (dto.locationId) {
      const location = await this.prisma.timeGateLocation.findUnique({
        where: { id: dto.locationId },
      });
      if (!location || location.companyId !== companyId) {
        throw new NotFoundException('Location not found');
      }
      if (
        location.type !== TimeGateLocationType.CLIENT_SITE &&
        location.type !== TimeGateLocationType.TEMPORARY
      ) {
        throw new BadRequestException('La mission doit cibler un site client ou temporaire');
      }
      return location;
    }

    const label = (dto.clientLabel ?? dto.title).trim();
    if (!label) {
      throw new BadRequestException('locationId ou clientLabel requis');
    }
    await this.quotas.assertCanAddLocation(companyId);
    return this.prisma.timeGateLocation.create({
      data: {
        id: generateDocId('LOC'),
        companyId,
        name: label,
        type: TimeGateLocationType.CLIENT_SITE,
        clientLabel: label,
        address: dto.address ?? null,
        isActive: true,
      },
    });
  }

  private generateSlug(): string {
    return randomBytes(9).toString('base64url').slice(0, 12);
  }

  private includeShape() {
    return {
      location: {
        select: { id: true, name: true, type: true, clientLabel: true, address: true },
      },
      branch: { select: { id: true, branchName: true } },
      kiosk: { select: { id: true, kioskName: true, isActive: true, qrEnabled: true } },
    } as const;
  }

  private toApiShape(row: {
    id: string;
    companyId: string;
    title: string;
    status: TimeGateClientMissionStatus;
    locationId: string;
    branchId: string;
    kioskId: string;
    publicSlug: string;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    location?: {
      id: string;
      name: string;
      type: TimeGateLocationType;
      clientLabel: string | null;
      address: string | null;
    };
    branch?: { id: string; branchName: string };
    kiosk?: { id: string; kioskName: string; isActive: boolean; qrEnabled: boolean };
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      title: row.title,
      status: row.status,
      locationId: row.locationId,
      branchId: row.branchId,
      kioskId: row.kioskId,
      publicSlug: row.publicSlug,
      publicPath: `/c/${row.publicSlug}`,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      location: row.location
        ? {
            id: row.location.id,
            name: row.location.name,
            type: row.location.type,
            clientLabel: row.location.clientLabel,
            address: row.location.address,
          }
        : undefined,
      branch: row.branch
        ? { id: row.branch.id, name: row.branch.branchName }
        : undefined,
      kiosk: row.kiosk
        ? {
            id: row.kiosk.id,
            name: row.kiosk.kioskName,
            isActive: row.kiosk.isActive,
            qrEnabled: row.kiosk.qrEnabled,
          }
        : undefined,
    };
  }

  private requireCompanyId(user: JwtUser): string {
    if (!user.companyId) throw new ForbiddenException('Company required');
    return user.companyId;
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (user.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access denied');
    }
    if (user.role === TimeGateUserRole.EMPLOYEE) {
      throw new ForbiddenException('Access denied');
    }
  }
}
