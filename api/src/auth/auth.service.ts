import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CheckinLogType,
  EmployeeStatus,
  KioskStatus,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateUserRole,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FaceEmbeddingService } from '../face/face-embedding.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';
import { MobileVerifyPinDto } from './dto/mobile-verify-pin.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';
import { AttendanceEventStatusService } from '../attendance/attendance-event-status.service';
import { resolveKioskEligibleEmployeeIds } from '../common/utils/kiosk-shift-rules.util';

type MobileTokenPayload = {
  typ: 'mobile_device';
  kioskId: string;
  branchId: string | null;
};

type MatchCandidate = {
  employeeId: string;
  firstName: string;
  lastName: string;
  similarity: number;
};

type AttendanceDecision =
  | { kind: 'CHECK_IN'; message: string }
  | { kind: 'CHECK_OUT'; message: string }
  | { kind: 'NONE'; message: string };

type VerifyMobileResult = {
  success: boolean;
  confidence: number | null;
  message: string;
  offlineSync: boolean;
  capturedAt: string | null;
  employee: { id: string; firstName: string; lastName: string } | null;
  log: { id: string; success: boolean; confidence: number | null; imageUrl: string | null; createdAt: Date };
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verifyIdempotencyCache = new Map<
    string,
    { expiresAt: number; response: VerifyMobileResult }
  >();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private face: FaceEmbeddingService,
    private readonly storage: CloudflareR2Service,
    private readonly eventStatus: AttendanceEventStatusService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    return {
      access_token: await this.signToken(
        user.id,
        user.email,
        user.timeGateRole!,
        user.companyId ?? null,
      ),
    };
  }

  /** Login for mobile/dashboard employee self-service (User linked to Employee). */
  async employeeLogin(dto: LoginDto) {
    const user = await this.validateEmployeeCredentials(dto);
    if (user.timeGateRole !== TimeGateUserRole.EMPLOYEE) {
      throw new UnauthorizedException('This account is not an employee portal user');
    }
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        status: true,
        branchId: true,
        companyId: true,
      },
    });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      throw new UnauthorizedException('No active employee profile linked to this account');
    }

    const branch = employee.branchId
      ? await this.prisma.branch.findUnique({
          where: { id: employee.branchId },
          select: { id: true, branchName: true },
        })
      : null;

    return {
      access_token: await this.signToken(
        user.id,
        user.email,
        user.timeGateRole!,
        user.companyId ?? null,
      ),
      employee: {
        id: employee.id,
        firstName: employee.firstName ?? employee.employeeName,
        lastName: employee.lastName ?? '',
        branchId: employee.branchId,
        branchName: branch?.branchName ?? null,
      },
    };
  }

  async mobileBootstrap(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    if (user.timeGateRole !== TimeGateUserRole.ADMIN && user.timeGateRole !== TimeGateUserRole.MANAGER) {
      throw new UnauthorizedException('Only ADMIN/MANAGER can provision kiosk devices');
    }
    if (!user.companyId) {
      throw new UnauthorizedException('Operator account must belong to a company');
    }

    const branches = await this.prisma.branch.findMany({
      where: { companyId: user.companyId },
      select: { id: true, branchName: true, address: true, timeZone: true },
      orderBy: { branchName: 'asc' },
    });

    return {
      operator_token: await this.signToken(
        user.id,
        user.email,
        user.timeGateRole!,
        user.companyId ?? null,
      ),
      operator: { id: user.id, email: user.email, role: user.timeGateRole },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.branchName,
        address: b.address,
        timezone: b.timeZone,
      })),
    };
  }

  async createUser(dto: CreateUserDto) {
    if (dto.role !== TimeGateUserRole.SUPER_ADMIN && !dto.companyId) {
      throw new BadRequestException('companyId is required for ADMIN/MANAGER users');
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email.trim().toLowerCase(),
        companyId: dto.companyId ?? null,
      },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: generateDocId('USR'),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        timeGateRole: dto.role,
        companyId: dto.companyId ?? null,
      },
      select: { id: true, email: true, timeGateRole: true, createdAt: true },
    });
    return { ...user, role: user.timeGateRole };
  }

  async activateSubscription(user: JwtUser, dto: ActivateSubscriptionDto) {
    const keyHash = createHash('sha256').update(dto.activationKey.trim()).digest('hex');
    const now = new Date();
    const activation = await this.prisma.timeGateActivationKey.findUnique({
      where: { keyHash },
      include: { company: { select: { id: true, sku: true, name: true } } },
    });
    if (!activation) {
      throw new NotFoundException('Activation key not found');
    }
    if (activation.revokedAt) {
      throw new ForbiddenException('Activation key revoked');
    }
    if (activation.usedAt) {
      throw new ConflictException('Activation key already used');
    }
    if (activation.expiresAt <= now) {
      throw new ForbiddenException('Activation key expired');
    }
    if (user.role !== TimeGateUserRole.SUPER_ADMIN && activation.companyId !== user.companyId) {
      throw new ForbiddenException('Activation key does not belong to your company');
    }

    const existingSubscription = await this.prisma.timeGateSubscription.findFirst({
      where: { companyId: activation.companyId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const [subscription] = await this.prisma.$transaction([
      existingSubscription
        ? this.prisma.timeGateSubscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan: activation.plan,
              maxEmployees: activation.maxEmployees,
              maxKiosks: activation.maxKiosks,
              expiresAt: activation.expiresAt,
            },
          })
        : this.prisma.timeGateSubscription.create({
            data: {
              id: generateDocId('SUB'),
              companyId: activation.companyId,
              plan: activation.plan,
              maxEmployees: activation.maxEmployees,
              maxKiosks: activation.maxKiosks,
              expiresAt: activation.expiresAt,
            },
          }),
      this.prisma.timeGateActivationKey.update({
        where: { id: activation.id },
        data: { usedAt: now },
      }),
    ]);

    return {
      activated: true,
      company: {
        id: activation.company.id,
        sku: activation.company.sku,
        name: activation.company.name,
      },
      subscription: {
        plan: subscription.plan,
        maxEmployees: subscription.maxEmployees,
        maxKiosks: subscription.maxKiosks,
        expiresAt: subscription.expiresAt,
      },
    };
  }

  async listOrganizations() {
    const companies = await this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        timeGateSubscriptions: {
          select: { id: true, plan: true, maxEmployees: true, maxKiosks: true, expiresAt: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        users: {
          select: { id: true, email: true, timeGateRole: true, createdAt: true },
          where: { timeGateRole: { in: [TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER] } },
          orderBy: { createdAt: 'desc' },
        },
        timeGateActivationKeys: {
          select: { id: true, plan: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      sku: c.sku,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      subscriptions: c.timeGateSubscriptions.map((s) => ({
        ...s,
        maxDevices: s.maxKiosks,
      })),
      users: c.users.map((u) => ({ ...u, role: u.timeGateRole })),
      activationKeys: c.timeGateActivationKeys,
    }));
  }

  async getOrganization(organizationId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: organizationId },
      include: {
        timeGateSubscriptions: {
          select: { id: true, plan: true, maxEmployees: true, maxKiosks: true, expiresAt: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        users: {
          select: { id: true, email: true, timeGateRole: true, createdAt: true },
          where: { timeGateRole: { in: [TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER] } },
          orderBy: { createdAt: 'desc' },
        },
        timeGateActivationKeys: {
          select: { id: true, plan: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!company) {
      throw new NotFoundException('Organization not found');
    }
    return {
      id: company.id,
      name: company.name,
      sku: company.sku,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      subscriptions: company.timeGateSubscriptions.map((s) => ({
        ...s,
        maxDevices: s.maxKiosks,
      })),
      users: company.users.map((u) => ({ ...u, role: u.timeGateRole })),
      activationKeys: company.timeGateActivationKeys,
    };
  }

  async listUsers(user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
    const users = await this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
        timeGateRole: { in: [TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER] },
      },
      select: {
        id: true,
        email: true,
        timeGateRole: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({ ...u, role: u.timeGateRole }));
  }

  async createOrganization(dto: CreateOrganizationDto) {
    return this.prisma.company.create({
      data: {
        id: generateDocId('CO'),
        name: dto.name.trim(),
        sku: dto.sku.trim().toUpperCase(),
      },
    });
  }

  async createOrganizationAdmin(organizationId: string, dto: CreateOrganizationAdminDto) {
    const company = await this.prisma.company.findUnique({ where: { id: organizationId } });
    if (!company) {
      throw new NotFoundException('Organization not found');
    }
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase(), companyId: organizationId },
    });
    if (existing) {
      throw new ConflictException('Admin email already exists for this organization');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: generateDocId('USR'),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        timeGateRole: TimeGateUserRole.ADMIN,
        companyId: organizationId,
      },
      select: { id: true, email: true, timeGateRole: true, companyId: true, createdAt: true },
    });
    return { ...user, role: user.timeGateRole };
  }

  async createActivationKey(organizationId: string, dto: CreateActivationKeyDto) {
    const company = await this.prisma.company.findUnique({ where: { id: organizationId } });
    if (!company) {
      throw new NotFoundException('Organization not found');
    }

    const plainKey = `TMGT-${randomBytes(8).toString('hex').toUpperCase()}`;
    const keyHash = createHash('sha256').update(plainKey).digest('hex');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    const created = await this.prisma.timeGateActivationKey.create({
      data: {
        id: generateDocId('KEY'),
        companyId: organizationId,
        keyHash,
        plan: dto.plan,
        maxEmployees: dto.maxEmployees,
        maxKiosks: dto.maxDevices,
        expiresAt,
      },
      select: {
        id: true,
        companyId: true,
        plan: true,
        maxEmployees: true,
        maxKiosks: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      maxKiosks: created.maxKiosks,
      activationKey: plainKey,
    };
  }

  getMe(user: JwtUser) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId ?? null,
    };
  }

  async getSubscriptionStatus(user: JwtUser) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) {
      return { active: true, role: user.role, subscription: null };
    }
    if (!user.companyId) {
      return { active: false, role: user.role, subscription: null };
    }
    const subscription = await this.prisma.timeGateSubscription.findFirst({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        maxEmployees: true,
        maxKiosks: true,
        expiresAt: true,
      },
    });
    const active = Boolean(subscription?.expiresAt && subscription.expiresAt > new Date());
    return {
      active,
      role: user.role,
      subscription: subscription
        ? {
            ...subscription,
            maxDevices: subscription.maxKiosks,
          }
        : null,
    };
  }

  private signToken(userId: string, email: string, role: TimeGateUserRole, companyId: string | null) {
    return this.jwt.signAsync({ sub: userId, email, role, companyId });
  }

  private async validateEmployeeCredentials(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, timeGateRole: TimeGateUserRole.EMPLOYEE },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  private async validateCredentials(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const superAdmin = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, timeGateRole: TimeGateUserRole.SUPER_ADMIN, companyId: null },
    });
    if (superAdmin) {
      const ok = await bcrypt.compare(dto.password, superAdmin.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return superAdmin;
    }

    if (!dto.sku?.trim()) {
      throw new UnauthorizedException('Organization SKU is required');
    }

    const company = await this.prisma.company.findFirst({
      where: { sku: dto.sku.trim().toUpperCase() },
      select: { id: true },
    });
    if (!company) {
      throw new UnauthorizedException('Invalid organization SKU');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, companyId: company.id },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async provisionMobile(dto: MobileProvisionDto) {
    const branchId = dto.branchId;
    const kiosk = dto.kioskId
      ? await this.prisma.timeGateKiosk.findUnique({ where: { id: dto.kioskId } })
      : await this.createProvisionedKiosk(branchId ?? null, dto.deviceName);

    if (!kiosk) {
      throw new NotFoundException('Kiosk not found');
    }

    const lifetime_token = await this.jwt.signAsync(
      {
        typ: 'mobile_device',
        kioskId: kiosk.id,
        branchId: kiosk.branchId,
      } satisfies MobileTokenPayload,
      { expiresIn: this.config.get<string>('MOBILE_LIFETIME_TOKEN_EXPIRES_IN') ?? '100y' },
    );

    return {
      lifetime_token,
      kiosk: {
        id: kiosk.id,
        name: kiosk.kioskName,
        branchId: kiosk.branchId,
      },
    };
  }

  async verifyMobilePhoto(
    token: string,
    file: Express.Multer.File,
    options?: { offlineSync?: boolean; capturedAt?: Date; idempotencyKey?: string; requestId?: string },
  ) {
    const verifyId = randomBytes(4).toString('hex');
    const startedAt = Date.now();
    const reqTag = options?.requestId ? ` reqId=${options.requestId}` : '';

    try {
      const payload = await this.verifyMobileToken(token);
      this.compactVerifyIdempotencyCache();
      const idempotencyKey = options?.idempotencyKey?.trim();
      const idempotencyCacheKey = idempotencyKey ? `${payload.kioskId}:${idempotencyKey}` : null;
      if (idempotencyCacheKey) {
        const cached = this.verifyIdempotencyCache.get(idempotencyCacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.response;
        }
      }

      if (!file?.buffer?.length) {
        throw new BadRequestException('Empty file');
      }

      const kiosk = await this.prisma.timeGateKiosk.findUnique({
        where: { id: payload.kioskId },
        select: {
          id: true,
          companyId: true,
          branchId: true,
          shiftLocationId: true,
        },
      });
      if (!kiosk) {
        throw new NotFoundException('Kiosk not found');
      }

      await this.prisma.timeGateKiosk.update({
        where: { id: kiosk.id },
        data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
      });

      const threshold = Number(this.config.get('FACE_VERIFY_THRESHOLD') ?? 0.82);
      const t = Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.82;
      const probe = await this.face.embedFromBuffer(file.buffer);

      const locationEmployeeIds = await resolveKioskEligibleEmployeeIds(this.prisma, kiosk);
      const employees = await this.prisma.employee.findMany({
        where: {
          status: EmployeeStatus.ACTIVE,
          companyId: kiosk.companyId,
          ...(kiosk.branchId ? { branchId: kiosk.branchId } : {}),
          ...(locationEmployeeIds
            ? { id: { in: locationEmployeeIds.length ? locationEmployeeIds : ['__none__'] } }
            : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeName: true,
          faceEmbedding: true,
        },
        take: 500,
      });
      if (!employees.length) {
        throw new BadRequestException('No enrolled employees available for this kiosk/branch');
      }

      let matched: MatchCandidate | null = null;
      for (const employee of employees) {
        const enrolled = this.toVector(employee.faceEmbedding);
        if (!enrolled) continue;
        const similarity = this.face.cosineSimilarity(probe, enrolled);
        if (similarity < t) continue;
        const firstName = employee.firstName ?? employee.employeeName;
        const lastName = employee.lastName ?? '';
        const candidate: MatchCandidate = {
          employeeId: employee.id,
          firstName,
          lastName,
          similarity,
        };
        if (!matched || candidate.similarity > matched.similarity) {
          matched = candidate;
        }
      }

      const success = Boolean(matched);
      const confidence = matched?.similarity ?? null;
      let imageUrl: string | null = null;
      try {
        imageUrl = await this.storage.uploadRecognitionImage({
          organizationId: kiosk.companyId,
          deviceId: kiosk.id,
          contentType: file.mimetype,
          buffer: file.buffer,
        });
      } catch (uploadError) {
        this.logger.error(
          `[verify:${verifyId}] image upload failed: ${
            uploadError instanceof Error ? uploadError.message : String(uploadError)
          }`,
        );
      }

      const log = await this.prisma.faceRecognitionLog.create({
        data: {
          id: generateDocId('FRL'),
          kioskId: kiosk.id,
          branchId: kiosk.branchId,
          companyId: kiosk.companyId,
          employeeId: matched?.employeeId ?? null,
          employeeName: matched ? `${matched.firstName} ${matched.lastName}`.trim() : null,
          success,
          confidence: confidence ?? undefined,
          photo: imageUrl ?? undefined,
          isOfflineSync: Boolean(options?.offlineSync),
          capturedAt: options?.capturedAt,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        select: { id: true, success: true, confidence: true, photo: true, createdAt: true },
      });

      if (options?.offlineSync) {
        await this.prisma.timeGateAuditLog.create({
          data: {
            id: generateDocId('AUD'),
            userId: null,
            companyId: kiosk.companyId,
            action: 'OFFLINE_SYNC_VERIFY',
            entity: 'FaceRecognitionLog',
            entityId: log.id,
          },
        });
      }

      let attendanceMessage: string | null = null;
      let birthdayMessage: string | null = null;
      if (success && matched) {
        attendanceMessage = await this.applyAttendanceFromVerification({
          employeeId: matched.employeeId,
          kioskId: kiosk.id,
          branchId: kiosk.branchId,
          companyId: kiosk.companyId,
          confidence: confidence ?? 1,
          verificationRef: log.id,
          source: options?.offlineSync
            ? TimeGateAttendanceEventSource.KIOSK_OFFLINE_SYNC
            : TimeGateAttendanceEventSource.KIOSK_ONLINE,
        });
        birthdayMessage = await this.buildBirthdayMessage(matched.employeeId);
      }

      const welcomeMessage = success
        ? `Bienvenue ${matched!.firstName} ${matched!.lastName}`
        : 'Visage non reconnu';
      const message = [welcomeMessage, attendanceMessage, birthdayMessage].filter(Boolean).join(' | ');

      const response: VerifyMobileResult = {
        success,
        confidence,
        message,
        offlineSync: Boolean(options?.offlineSync),
        capturedAt: options?.capturedAt?.toISOString() ?? null,
        employee: success
          ? {
              id: matched!.employeeId,
              firstName: matched!.firstName,
              lastName: matched!.lastName,
            }
          : null,
        log: {
          id: log.id,
          success: log.success,
          confidence: log.confidence ? Number(log.confidence) : null,
          imageUrl: log.photo,
          createdAt: log.createdAt,
        },
      };

      if (idempotencyCacheKey) {
        this.verifyIdempotencyCache.set(idempotencyCacheKey, {
          response,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
      }
      return response;
    } catch (error) {
      this.logger.error(
        `[verify:${verifyId}] failed after ${Date.now() - startedAt}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async verifyMobilePin(
    token: string,
    dto: MobileVerifyPinDto,
    options?: { idempotencyKey?: string; requestId?: string; offlineSync?: boolean; capturedAt?: Date },
  ) {
    const payload = await this.verifyMobileToken(token);
    this.compactVerifyIdempotencyCache();
    const idempotencyKey = options?.idempotencyKey?.trim();
    const idempotencyCacheKey = idempotencyKey ? `${payload.kioskId}:pin:${idempotencyKey}` : null;
    if (idempotencyCacheKey) {
      const cached = this.verifyIdempotencyCache.get(idempotencyCacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.response;
      }
    }

    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id: payload.kioskId },
      select: { id: true, companyId: true, branchId: true },
    });
    if (!kiosk) throw new NotFoundException('Kiosk not found');

    await this.prisma.timeGateKiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
    });

    const locationEmployeeIds = await resolveKioskEligibleEmployeeIds(this.prisma, kiosk);
    if (locationEmployeeIds && !locationEmployeeIds.includes(dto.employeeId)) {
      throw new BadRequestException('Employee not eligible for this kiosk');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        status: EmployeeStatus.ACTIVE,
        companyId: kiosk.companyId,
        ...(kiosk.branchId ? { branchId: kiosk.branchId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeName: true,
        kioskPinHash: true,
      },
    });
    if (!employee?.kioskPinHash) {
      throw new BadRequestException('PIN kiosk non configure pour cet employe');
    }

    const pinOk = await bcrypt.compare(dto.pin, employee.kioskPinHash);
    if (!pinOk) {
      throw new UnauthorizedException('PIN incorrect');
    }

    const firstName = employee.firstName ?? employee.employeeName;
    const lastName = employee.lastName ?? '';
    const log = await this.prisma.faceRecognitionLog.create({
      data: {
        id: generateDocId('FRL'),
        kioskId: kiosk.id,
        branchId: kiosk.branchId,
        companyId: kiosk.companyId,
        employeeId: employee.id,
        employeeName: `${firstName} ${lastName}`.trim(),
        success: true,
        confidence: 1,
        isOfflineSync: Boolean(options?.offlineSync),
        capturedAt: options?.capturedAt,
        idempotencyKey: idempotencyKey ?? undefined,
      },
      select: { id: true, success: true, confidence: true, photo: true, createdAt: true },
    });

    const attendanceMessage = await this.applyAttendanceFromVerification({
      employeeId: employee.id,
      kioskId: kiosk.id,
      branchId: kiosk.branchId,
      companyId: kiosk.companyId,
      confidence: 1,
      verificationRef: log.id,
      source: options?.offlineSync
        ? TimeGateAttendanceEventSource.KIOSK_OFFLINE_SYNC
        : TimeGateAttendanceEventSource.KIOSK_ONLINE,
    });
    const birthdayMessage = await this.buildBirthdayMessage(employee.id);
    const message = [`Bienvenue ${firstName} ${lastName}`.trim(), attendanceMessage, birthdayMessage]
      .filter(Boolean)
      .join(' | ');

    const response: VerifyMobileResult = {
      success: true,
      confidence: 1,
      message,
      offlineSync: Boolean(options?.offlineSync),
      capturedAt: options?.capturedAt?.toISOString() ?? null,
      employee: { id: employee.id, firstName, lastName },
      log: {
        id: log.id,
        success: log.success,
        confidence: log.confidence ? Number(log.confidence) : 1,
        imageUrl: log.photo,
        createdAt: log.createdAt,
      },
    };

    if (idempotencyCacheKey) {
      this.verifyIdempotencyCache.set(idempotencyCacheKey, {
        response,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }
    return response;
  }

  private compactVerifyIdempotencyCache() {
    const now = Date.now();
    for (const [key, value] of this.verifyIdempotencyCache.entries()) {
      if (value.expiresAt <= now) {
        this.verifyIdempotencyCache.delete(key);
      }
    }
  }

  private async applyAttendanceFromVerification(params: {
    employeeId: string;
    kioskId: string;
    branchId: string;
    companyId: string;
    confidence: number;
    verificationRef?: string;
    source?: TimeGateAttendanceEventSource;
  }): Promise<string> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: params.employeeId },
      select: { id: true, employeeName: true, firstName: true, lastName: true, status: true, branchId: true },
    });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
      return 'Employe introuvable ou inactif pour le pointage.';
    }
    if (!employee.branchId) {
      return "Employe sans site d'affectation. Pointage non enregistre.";
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const todaysCheckins = await this.prisma.employeeCheckin.findMany({
      where: { employeeId: params.employeeId, time: { gte: dayStart, lte: dayEnd } },
      orderBy: { time: 'asc' },
      select: { logType: true },
    });
    const hasCheckIn = todaysCheckins.some((c) => c.logType === CheckinLogType.IN);
    const hasCheckOut = todaysCheckins.some((c) => c.logType === CheckinLogType.OUT);

    const decision = this.decideAttendance({ hasCheckIn, hasCheckOut });
    if (decision.kind === 'NONE') {
      return decision.message;
    }

    const eventType =
      decision.kind === 'CHECK_IN'
        ? TimeGateAttendanceEventType.CHECK_IN
        : TimeGateAttendanceEventType.CHECK_OUT;

    const { status, autoReviewReason } = await this.eventStatus.resolveForCompany(
      params.companyId,
      params.confidence,
    );
    const pendingMeta = this.eventStatus.buildPendingMeta({ status, autoReviewReason });

    const event = await this.prisma.timeGateAttendanceEvent.create({
      data: {
        id: generateDocId('AEV'),
        companyId: params.companyId,
        branchId: params.branchId,
        kioskId: params.kioskId,
        employeeId: params.employeeId,
        source: params.source ?? TimeGateAttendanceEventSource.KIOSK_ONLINE,
        type: eventType,
        status,
        occurredAt: now,
        confidence: params.confidence,
        verificationRef: params.verificationRef,
        idempotencyKey: params.verificationRef
          ? `verify:${params.verificationRef}:attendance:${decision.kind}`
          : undefined,
        meta: pendingMeta,
      },
    });

    if (status === TimeGateAttendanceEventStatus.ACCEPTED) {
      await this.eventStatus.materializeAcceptedEvent(event);
      return decision.message;
    }

    return `${decision.message} En attente de validation manager (confiance ${params.confidence.toFixed(2)}).`;
  }

  private decideAttendance(params: { hasCheckIn: boolean; hasCheckOut: boolean }): AttendanceDecision {
    if (params.hasCheckOut) {
      return { kind: 'NONE', message: "Pointage de fin deja enregistre pour aujourd'hui." };
    }
    if (params.hasCheckIn) {
      return { kind: 'CHECK_OUT', message: 'Pointage de fin enregistre.' };
    }
    return { kind: 'CHECK_IN', message: "Pointage d'arrivee enregistre." };
  }

  private async buildBirthdayMessage(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, employeeName: true, dateOfBirth: true, cellNumber: true },
    });
    if (!employee?.dateOfBirth) return null;
    const today = new Date();
    if (
      employee.dateOfBirth.getDate() === today.getDate() &&
      employee.dateOfBirth.getMonth() === today.getMonth()
    ) {
      const name = employee.firstName ?? employee.employeeName;
      if (employee.cellNumber) {
        this.logger.log(
          `[birthday] WhatsApp enqueue simulated for employee=${employeeId} to=${employee.cellNumber}`,
        );
      }
      return `Joyeux anniversaire ${name} !`;
    }
    return null;
  }

  async heartbeatMobile(token: string) {
    const payload = await this.verifyMobileToken(token);
    const kiosk = await this.prisma.timeGateKiosk.update({
      where: { id: payload.kioskId },
      data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
      select: { id: true, status: true, lastSeenAt: true },
    });
    return {
      ok: true,
      device: {
        id: kiosk.id,
        status: kiosk.status,
        lastSeenAt: kiosk.lastSeenAt,
      },
    };
  }

  private async verifyMobileToken(token: string): Promise<MobileTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<MobileTokenPayload>(token);
      if (payload?.typ !== 'mobile_device' || !payload.kioskId) {
        throw new UnauthorizedException('Invalid mobile token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid mobile token');
    }
  }

  private async createProvisionedKiosk(
    branchId: string | null,
    deviceName: string | undefined,
  ) {
    if (!branchId) {
      throw new BadRequestException('Missing branchId for new kiosk creation.');
    }
    const name = deviceName?.trim() || `Kiosk-${Date.now().toString().slice(-6)}`;
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const existing = await this.prisma.timeGateKiosk.findUnique({ where: { branchId } });
    if (existing) {
      return existing;
    }

    return this.prisma.timeGateKiosk.create({
      data: {
        id: generateDocId('KSK'),
        kioskName: name,
        branchId,
        companyId: branch.companyId,
        deviceApiKey: randomBytes(24).toString('hex'),
        status: KioskStatus.ONLINE,
        lastSeenAt: new Date(),
      },
    });
  }

  private toVector(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    const vector = value.filter((v): v is number => typeof v === 'number');
    return vector.length ? vector : null;
  }
}
