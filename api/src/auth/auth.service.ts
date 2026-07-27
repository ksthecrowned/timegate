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
  Prisma,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGateAttendanceAuthMethod,
  TimeGateSubscriptionSource,
  TimeGateSubscriptionStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FaceEmbeddingService } from '../face/face-embedding.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { CreateUserDto } from './dto/create-user.dto';
import { TrustedDevicesService } from '../trusted-devices/trusted-devices.service';
import { EmployeeIdentifyDto, EmployeeLoginDto } from './dto/employee-auth.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';
import { MobileVerifyPinDto } from './dto/mobile-verify-pin.dto';
import { MobileVerifyNfcDto } from './dto/mobile-verify-nfc.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { SignupDto } from './dto/signup.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from './mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionQuotaService } from '../saas/subscription-quota.service';
import { SubscriptionStateService } from '../saas/subscription-state.service';
import { AttendanceEventStatusService } from '../attendance/attendance-event-status.service';
import { AttendancePunchRecorderService } from '../attendance/attendance-punch-recorder.service';
import { PunchAttemptLogService } from '../attendance/punch-attempt-log.service';
import { resolveAttendancePunch } from '../attendance/attendance-punch-resolver';
import {
  buildDayPunchStateFromEvents,
  PunchWindowService,
} from '../attendance/punch-window.service';
import { dateToMinutes } from '../common/utils/punch-time.util';
import {
  buildKioskQrChallengePayload,
  generateKioskQrChallengeSecret,
} from '../common/utils/kiosk-qr-challenge.util';
import { isWithinBranchRadius } from '../common/utils/geo.util';

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
    private readonly punchRecorder: AttendancePunchRecorderService,
    private readonly punchAttemptLog: PunchAttemptLogService,
    private readonly punchWindows: PunchWindowService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly subscriptionState: SubscriptionStateService,
    private readonly subscriptionQuota: SubscriptionQuotaService,
    private readonly trustedDevices: TrustedDevicesService,
  ) {}

  async signup(dto: SignupDto) {
    const settings = await this.subscriptionState.getPlatformSettings();
    const email = dto.adminEmail.trim().toLowerCase();
    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Un compte existe deja avec cet e-mail');
    }

    const sku = await this.resolveUniqueSignupSku(dto.organizationName, dto.sku);
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const trialEndsAt = new Date(Date.now() + settings.trialDays * 24 * 60 * 60 * 1000);

    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          id: generateDocId('CO'),
          name: dto.organizationName.trim(),
          sku,
          organizationSize: dto.organizationSize,
          email: email,
        },
      });

      await tx.branch.create({
        data: {
          id: generateDocId('BR'),
          branchName: 'Siège',
          companyId: company.id,
          isHeadOffice: true,
          isActive: true,
        },
      });

      await tx.timeGateSystemSettings.create({
        data: {
          id: generateDocId('CFG'),
          companyId: company.id,
        },
      });

      const user = await tx.user.create({
        data: {
          id: generateDocId('USR'),
          email,
          passwordHash,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          jobTitle: dto.contactRole,
          timeGateRole: TimeGateUserRole.ADMIN,
          companyId: company.id,
        },
      });

      const subscription = await tx.timeGateSubscription.create({
        data: {
          id: generateDocId('SUB'),
          companyId: company.id,
          plan: 'TRIAL',
          maxEmployees: settings.trialMaxEmployees,
          maxKiosks: settings.trialMaxKiosks,
          status: TimeGateSubscriptionStatus.TRIAL,
          source: TimeGateSubscriptionSource.SELF_SIGNUP,
          trialEndsAt,
          expiresAt: trialEndsAt,
        },
      });

      return { company, user, subscription };
    });

    return {
      access_token: await this.signToken(
        created.user.id,
        created.user.email,
        created.user.timeGateRole!,
        created.company.id,
        { kind: 'user' },
      ),
      organization: {
        id: created.company.id,
        name: created.company.name,
        sku: created.company.sku,
      },
      subscription: {
        status: created.subscription.status,
        plan: created.subscription.plan,
        maxEmployees: created.subscription.maxEmployees,
        maxKiosks: created.subscription.maxKiosks,
        trialEndsAt: created.subscription.trialEndsAt,
        expiresAt: created.subscription.expiresAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const account = await this.validateCredentials(dto);
    return {
      access_token: await this.signToken(
        account.id,
        account.email,
        account.role,
        account.companyId,
        { kind: account.kind },
      ),
    };
  }

  /** Step 0: branch login flow for employee app (email only). */
  async employeeIdentify(dto: EmployeeIdentifyDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, timeGateRole: TimeGateUserRole.EMPLOYEE },
      select: { passwordHash: true },
    });
    if (!user) {
      return { nextStep: 'CHECK_EMAIL' as const };
    }
    return {
      nextStep: user.passwordHash ? ('PASSWORD' as const) : ('OTP_SETUP' as const),
    };
  }

  /** Login for mobile/dashboard employee self-service (User linked to Employee). */
  async employeeLogin(dto: EmployeeLoginDto) {
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

    const { trust } = await this.trustedDevices.registerOnLogin({
      userId: user.id,
      deviceInstallId: dto.deviceInstallId,
      platform: dto.platform,
      deviceLabel: dto.deviceLabel,
    });

    const branch = employee.branchId
      ? await this.prisma.branch.findUnique({
          where: { id: employee.branchId },
          select: { id: true, branchName: true },
        })
      : null;

    const deviceTrustMessage =
      trust === 'PENDING'
        ? 'Appareil en attente de validation. Pointage indisponible.'
        : null;

    return {
      access_token: await this.signToken(
        user.id,
        user.email,
        user.timeGateRole!,
        user.companyId ?? null,
        { deviceInstallId: dto.deviceInstallId.trim(), deviceTrust: trust },
      ),
      deviceTrust: trust,
      deviceTrustMessage,
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
    const account = await this.validateCredentials(dto);
    if (account.kind !== 'user') {
      throw new UnauthorizedException('Only ADMIN/MANAGER can provision kiosk devices');
    }
    if (account.role !== TimeGateUserRole.ADMIN && account.role !== TimeGateUserRole.MANAGER) {
      throw new UnauthorizedException('Only ADMIN/MANAGER can provision kiosk devices');
    }
    if (!account.companyId) {
      throw new UnauthorizedException('Operator account must belong to a company');
    }

    const branches = await this.prisma.branch.findMany({
      where: { companyId: account.companyId },
      select: { id: true, branchName: true, address: true, timeZone: true },
      orderBy: { branchName: 'asc' },
    });

    return {
      operator_token: await this.signToken(
        account.id,
        account.email,
        account.role,
        account.companyId,
        { kind: 'user' },
      ),
      operator: { id: account.id, email: account.email, role: account.role },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.branchName,
        address: b.address,
        timezone: b.timeZone,
      })),
    };
  }

  async createUser(actor: JwtUser, dto: CreateUserDto) {
    if (actor.kind !== 'user' || actor.role !== TimeGateUserRole.ADMIN) {
      throw new ForbiddenException('Only organization ADMIN users can create tenant accounts');
    }
    if (!actor.companyId) {
      throw new BadRequestException('Company context is required');
    }
    if (
      dto.role !== TimeGateUserRole.ADMIN &&
      dto.role !== TimeGateUserRole.MANAGER &&
      dto.role !== TimeGateUserRole.EMPLOYEE
    ) {
      throw new BadRequestException('Invalid organization role');
    }

    const companyId = actor.companyId;
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email, companyId },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        id: generateDocId('USR'),
        email,
        passwordHash,
        timeGateRole: dto.role,
        companyId,
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
    if (user.role !== PLATFORM_ADMIN && activation.companyId !== user.companyId) {
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
              planId: activation.planId,
              maxEmployees: activation.maxEmployees,
              maxKiosks: activation.maxKiosks,
              expiresAt: activation.expiresAt,
              status: TimeGateSubscriptionStatus.ACTIVE,
              source: TimeGateSubscriptionSource.ACTIVATION_KEY,
              trialEndsAt: null,
              graceEndsAt: null,
            },
          })
        : this.prisma.timeGateSubscription.create({
            data: {
              id: generateDocId('SUB'),
              companyId: activation.companyId,
              plan: activation.plan,
              planId: activation.planId,
              maxEmployees: activation.maxEmployees,
              maxKiosks: activation.maxKiosks,
              expiresAt: activation.expiresAt,
              status: TimeGateSubscriptionStatus.ACTIVE,
              source: TimeGateSubscriptionSource.ACTIVATION_KEY,
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
          select: {
            id: true,
            plan: true,
            maxEmployees: true,
            maxKiosks: true,
            expiresAt: true,
            usedAt: true,
            revokedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const now = new Date();
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      sku: c.sku,
      suspendedAt: c.suspendedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      subscriptions: c.timeGateSubscriptions.map((s) => ({
        ...s,
        maxDevices: s.maxKiosks,
      })),
      users: c.users.map((u) => ({ ...u, role: u.timeGateRole })),
      activationKeys: c.timeGateActivationKeys.map((k) => this.mapActivationKey(k, now)),
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
          select: {
            id: true,
            plan: true,
            maxEmployees: true,
            maxKiosks: true,
            expiresAt: true,
            usedAt: true,
            revokedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!company) {
      throw new NotFoundException('Organization not found');
    }
    const now = new Date();
    return {
      id: company.id,
      name: company.name,
      sku: company.sku,
      suspendedAt: company.suspendedAt,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      subscriptions: company.timeGateSubscriptions.map((s) => ({
        ...s,
        maxDevices: s.maxKiosks,
      })),
      users: company.users.map((u) => ({ ...u, role: u.timeGateRole })),
      activationKeys: company.timeGateActivationKeys.map((k) => this.mapActivationKey(k, now)),
    };
  }

  async listActivationKeys() {
    const now = new Date();
    const keys = await this.prisma.timeGateActivationKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyId: true,
        plan: true,
        maxEmployees: true,
        maxKiosks: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        createdAt: true,
        company: { select: { id: true, name: true, sku: true } },
      },
    });

    return keys.map((k) => ({
      ...this.mapActivationKey(k, now),
      companyId: k.companyId,
      company: k.company,
    }));
  }

  private mapActivationKey(
    key: {
      id: string;
      plan: string;
      maxEmployees: number;
      maxKiosks: number;
      expiresAt: Date;
      usedAt: Date | null;
      revokedAt: Date | null;
      createdAt: Date;
    },
    now: Date,
  ) {
    let status: 'AVAILABLE' | 'USED' | 'REVOKED' | 'EXPIRED' = 'AVAILABLE';
    if (key.revokedAt) {
      status = 'REVOKED';
    } else if (key.usedAt) {
      status = 'USED';
    } else if (key.expiresAt <= now) {
      status = 'EXPIRED';
    }

    return {
      id: key.id,
      plan: key.plan,
      maxEmployees: key.maxEmployees,
      maxKiosks: key.maxKiosks,
      maxDevices: key.maxKiosks,
      expiresAt: key.expiresAt,
      usedAt: key.usedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
      status,
    };
  }

  async listUsers(user: JwtUser) {
    if (!user.companyId) {
      throw new BadRequestException('Company context is required');
    }
    const users = await this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
        timeGateRole: {
          in: [TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER, TimeGateUserRole.EMPLOYEE],
        },
      },
      select: {
        id: true,
        email: true,
        timeGateRole: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            employeeName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => ({
      ...u,
      role: u.timeGateRole,
      employee: u.employee
        ? {
            id: u.employee.id,
            name: u.employee.employeeName,
            status: u.employee.status,
          }
        : null,
    }));
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
    if (!dto.planId && !dto.plan?.trim()) {
      throw new BadRequestException('plan or planId is required');
    }

    let planCode = dto.plan?.trim().toUpperCase() ?? 'CUSTOM';
    let maxEmployees = dto.maxEmployees ?? 10;
    let maxKiosks = dto.maxDevices ?? 1;
    let planId: string | null = dto.planId ?? null;
    let expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    if (dto.planId) {
      const catalogPlan = await this.prisma.timeGateSubscriptionPlan.findUnique({
        where: { id: dto.planId },
      });
      if (!catalogPlan) {
        throw new BadRequestException('Subscription plan not found');
      }
      planCode = catalogPlan.code;
      planId = catalogPlan.id;
      if (dto.maxEmployees === undefined) maxEmployees = catalogPlan.maxEmployees;
      if (dto.maxDevices === undefined) maxKiosks = catalogPlan.maxKiosks;
      if (!dto.expiresAt && catalogPlan.durationDays) {
        expiresAt = new Date(Date.now() + catalogPlan.durationDays * 24 * 60 * 60 * 1000);
      }
    }

    const plainKey = `TMGT-${randomBytes(8).toString('hex').toUpperCase()}`;
    const keyHash = createHash('sha256').update(plainKey).digest('hex');

    const created = await this.prisma.timeGateActivationKey.create({
      data: {
        id: generateDocId('KEY'),
        companyId: organizationId,
        keyHash,
        plan: planCode,
        planId,
        maxEmployees,
        maxKiosks,
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

  async getMe(user: JwtUser) {
    if (user.kind === 'admin' || user.role === PLATFORM_ADMIN) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: user.sub },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (!admin) throw new UnauthorizedException();
      return {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        kind: 'admin' as const,
        role: PLATFORM_ADMIN,
        companyId: null,
        employeeId: null,
      };
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        timeGateRole: true,
        companyId: true,
        employee: { select: { id: true } },
      },
    });
    if (!dbUser) {
      throw new UnauthorizedException();
    }
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      kind: 'user' as const,
      role: dbUser.timeGateRole,
      companyId: dbUser.companyId,
      employeeId: dbUser.employee?.id ?? null,
    };
  }

  async updateMe(user: JwtUser, dto: UpdateMeDto) {
    if (user.kind === 'admin' || user.role === PLATFORM_ADMIN) {
      const data: { firstName?: string | null; lastName?: string | null } = {};
      if (dto.firstName !== undefined) data.firstName = dto.firstName.trim() || null;
      if (dto.lastName !== undefined) data.lastName = dto.lastName.trim() || null;
      const updated = await this.prisma.admin.update({
        where: { id: user.sub },
        data,
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      return {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        kind: 'admin' as const,
        role: PLATFORM_ADMIN,
        companyId: null,
        employeeId: null,
      };
    }
    if (user.role === TimeGateUserRole.EMPLOYEE) {
      throw new ForbiddenException('Profil employé en lecture seule');
    }
    const data: { firstName?: string | null; lastName?: string | null } = {};
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim() || null;
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim() || null;
    }
    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        timeGateRole: true,
        companyId: true,
        employee: { select: { id: true } },
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      kind: 'user' as const,
      role: updated.timeGateRole,
      companyId: updated.companyId,
      employeeId: updated.employee?.id ?? null,
    };
  }

  // --- Password reset flow (forgot / verify / reset) ---

  private hashOtp(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private safeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }

  /** Step 1: send a 6-digit OTP to the user's email.
   *  Returns the same shape regardless of email existence to prevent enumeration. */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      // Silently succeed to avoid user enumeration.
      return { ok: true as const };
    }

    // Throttle: don't send a new code if one was issued < 60s ago.
    const recent = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return { ok: true as const };
    }

    const code = String(randomInt(100000, 1_000_000));
    const codeHash = this.hashOtp(code);
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        id: generateDocId('PRT'),
        userId: user.id,
        codeHash,
        // resetTokenHash is filled when the user verifies the code.
        resetTokenHash: this.hashOtp(`pending-${randomBytes(8).toString('hex')}`),
        codeExpiresAt,
        tokenExpiresAt,
      },
    });

    try {
      await this.mail.sendOtpEmail({ to: email, code, expiresInMinutes: 10 });
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${email}: ${(err as Error).message}`);
    }
    return { ok: true as const };
  }

  /** Step 2: verify the 6-digit code and return a one-time reset token. */
  async verifyResetCode(
    dto: VerifyResetCodeDto,
  ): Promise<{ ok: true; resetToken: string; expiresIn: number }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const row = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        codeExpiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.attempts >= 5) {
      throw new BadRequestException('Code invalide ou expiré');
    }

    const candidate = this.hashOtp(dto.code);
    const matches = this.safeEqualHex(candidate, row.codeHash);

    if (!matches) {
      await this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Code invalide ou expiré');
    }

    // Issue a long-lived opaque reset token (30 min).
    const resetToken = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.update({
      where: { id: row.id },
      data: {
        resetTokenHash: this.hashOtp(resetToken),
        tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 0,
      },
    });

    return { ok: true as const, resetToken, expiresIn: 1800 };
  }

  /** Step 3: exchange the reset token for a new password. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    const tokenHash = this.hashOtp(dto.resetToken);
    const row = await this.prisma.passwordResetToken.findFirst({
      where: {
        resetTokenHash: tokenHash,
        usedAt: null,
        tokenExpiresAt: { gt: new Date() },
      },
    });
    if (!row) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const user = await this.prisma.user.findUnique({
      where: { id: row.userId },
      select: { id: true, email: true, companyId: true },
    });
    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      ...(user.companyId
        ? [
            this.prisma.timeGateAuditLog.create({
              data: {
                id: generateDocId('AUD'),
                userId: user.id,
                companyId: user.companyId,
                action: 'PASSWORD_RESET',
                entity: 'User',
                entityId: user.id,
              },
            }),
          ]
        : []),
    ]);

    try {
      await this.mail.sendPasswordChangedEmail({ to: user.email });
    } catch (err) {
      this.logger.error(
        `Failed to send password-changed email to ${user.email}: ${(err as Error).message}`,
      );
    }
    return { ok: true as const };
  }

  async changePassword(user: JwtUser, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent');
    }

    if (user.kind === 'admin' || user.role === PLATFORM_ADMIN) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: user.sub },
        select: { id: true, passwordHash: true },
      });
      if (!admin?.passwordHash) {
        throw new UnauthorizedException('Mot de passe actuel incorrect');
      }
      const okAdmin = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
      if (!okAdmin) {
        throw new UnauthorizedException('Mot de passe actuel incorrect');
      }
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
      });
      return { ok: true as const };
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, passwordHash: true, companyId: true },
    });
    if (!dbUser?.passwordHash) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const ok = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash },
    });
    const auditCompanyId = dbUser.companyId;
    if (auditCompanyId) {
      await this.prisma.timeGateAuditLog.create({
        data: {
          id: generateDocId('AUD'),
          userId: dbUser.id,
          companyId: auditCompanyId,
          action: 'PASSWORD_CHANGED',
          entity: 'User',
          entityId: dbUser.id,
        },
      });
    }
    return { ok: true as const };
  }

  async getSubscriptionStatus(user: JwtUser) {
    if (user.role === PLATFORM_ADMIN) {
      return {
        active: true,
        readOnly: false,
        blocked: false,
        status: TimeGateSubscriptionStatus.ACTIVE,
        role: user.role,
        subscription: null,
      };
    }
    if (!user.companyId) {
      return {
        active: false,
        readOnly: false,
        blocked: true,
        status: null,
        role: user.role,
        subscription: null,
      };
    }

    const resolved = await this.subscriptionState.resolveForCompany(user.companyId);
    if (!resolved) {
      return {
        active: false,
        readOnly: false,
        blocked: true,
        status: null,
        role: user.role,
        subscription: null,
      };
    }

    const usage = await this.subscriptionQuota.getUsage(user.companyId);
    const { subscription, effectiveStatus } = resolved;

    const graceEndsAt =
      subscription.graceEndsAt ??
      (effectiveStatus === TimeGateSubscriptionStatus.GRACE_READ_ONLY &&
      subscription.expiresAt
        ? new Date(
            subscription.expiresAt.getTime() +
              (await this.subscriptionState.getPlatformSettings()).gracePeriodDays *
                24 *
                60 *
                60 *
                1000,
          )
        : null);

    return {
      active: resolved.isOperational,
      readOnly: resolved.isReadOnly,
      blocked: resolved.isBlocked,
      status: effectiveStatus,
      role: user.role,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        planId: subscription.planId,
        maxEmployees: subscription.maxEmployees,
        maxKiosks: subscription.maxKiosks,
        maxDevices: subscription.maxKiosks,
        status: effectiveStatus,
        storedStatus: subscription.status,
        source: subscription.source,
        trialEndsAt: subscription.trialEndsAt,
        graceEndsAt,
        expiresAt: subscription.expiresAt,
        daysUntilExpiry: resolved.daysUntilExpiry,
        daysUntilGraceEnd: resolved.daysUntilGraceEnd,
        usage,
      },
    };
  }

  private async resolveUniqueSignupSku(organizationName: string, requested?: string) {
    const base = this.normalizeSignupSku(requested ?? organizationName);
    let candidate = base;
    let attempt = 0;
    while (attempt < 20) {
      const exists = await this.prisma.company.findFirst({ where: { sku: candidate } });
      if (!exists) return candidate;
      attempt += 1;
      candidate = `${base.slice(0, 14)}-${randomBytes(2).toString('hex').toUpperCase()}`;
    }
    throw new ConflictException('Impossible de generer un SKU unique');
  }

  private normalizeSignupSku(raw: string): string {
    const normalized = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase();
    return (normalized || 'ORG').slice(0, 20);
  }

  private signToken(
    userId: string,
    email: string,
    role: TimeGateUserRole | typeof PLATFORM_ADMIN,
    companyId: string | null,
    extras?: {
      deviceInstallId?: string;
      deviceTrust?: 'TRUSTED' | 'PENDING';
      kind?: 'admin' | 'user';
    },
  ) {
    const kind = extras?.kind ?? (role === PLATFORM_ADMIN ? 'admin' : 'user');
    return this.jwt.signAsync({
      sub: userId,
      email,
      role,
      kind,
      companyId,
      ...(extras?.deviceInstallId ? { deviceInstallId: extras.deviceInstallId } : {}),
      ...(extras?.deviceTrust ? { deviceTrust: extras.deviceTrust } : {}),
    });
  }

  private async validateEmployeeCredentials(dto: { email: string; password: string }) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, timeGateRole: TimeGateUserRole.EMPLOYEE },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Mot de passe non configuré. Utilisez la procédure d’activation par e-mail.',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  private async validateCredentials(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Platform Admin entity (console) — no organization SKU.
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });
    if (admin) {
      if (!admin.enabled || !admin.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const ok = await bcrypt.compare(dto.password, admin.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return {
        kind: 'admin' as const,
        id: admin.id,
        email: admin.email,
        role: PLATFORM_ADMIN,
        companyId: null as string | null,
      };
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
    if (!user || !user.timeGateRole) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      kind: 'user' as const,
      id: user.id,
      email: user.email,
      role: user.timeGateRole,
      companyId: user.companyId,
    };
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

    const deviceTokenHash = createHash('sha256').update(lifetime_token).digest('hex');
    const existingSecret = kiosk.qrChallengeSecret;
    const qrChallengeSecret = existingSecret ?? generateKioskQrChallengeSecret();
    const updatedKiosk = await this.prisma.timeGateKiosk.update({
      where: { id: kiosk.id },
      data: {
        deviceToken: deviceTokenHash,
        status: KioskStatus.ONLINE,
        lastSeenAt: new Date(),
        ...(!existingSecret ? { qrChallengeSecret } : {}),
      },
      select: {
        id: true,
        kioskName: true,
        branchId: true,
        faceEnabled: true,
        nfcEnabled: true,
        qrEnabled: true,
        companyId: true,
        qrChallengeSecret: true,
      },
    });

    const pinSettings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId: updatedKiosk.companyId },
      select: {
        pinFailureThreshold: true,
        pinFailureCooldownSeconds: true,
        allowOfflineSync: true,
        offlineSyncMaxAgeMinutes: true,
      },
    });

    return {
      lifetime_token,
      kiosk: {
        id: updatedKiosk.id,
        name: updatedKiosk.kioskName,
        branchId: updatedKiosk.branchId,
      },
      features: this.buildKioskFeatures(updatedKiosk, pinSettings),
      // Returned on every provision so the device can (re)store offline signing material.
      qrChallengeSecret: updatedKiosk.qrChallengeSecret ?? qrChallengeSecret,
    };
  }

  async createQrChallenge(token: string) {
    const payload = await this.verifyMobileToken(token);
    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id: payload.kioskId },
      select: {
        id: true,
        qrEnabled: true,
        qrChallengeSecret: true,
        isActive: true,
      },
    });
    if (!kiosk) throw new NotFoundException('Kiosk not found');
    if (!kiosk.isActive || !kiosk.qrEnabled) {
      throw new ForbiddenException('Pointage QR desactive sur cette borne');
    }
    if (!kiosk.qrChallengeSecret) {
      throw new BadRequestException('Secret QR manquant — re-provisionnez la borne');
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
      expiresAt: built.expiresAt,
      nonce: built.nonce,
    };
  }

  async getQrChallengeResult(token: string, challengeId: string) {
    const payload = await this.verifyMobileToken(token);
    const row = await this.prisma.timeGateQrChallenge.findFirst({
      where: { id: challengeId, kioskId: payload.kioskId },
      select: {
        id: true,
        expiresAt: true,
        redeemedAt: true,
        resultJson: true,
      },
    });
    if (!row) throw new NotFoundException('Challenge not found');
    if (row.redeemedAt) {
      return {
        status: 'REDEEMED' as const,
        result: row.resultJson ?? null,
      };
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return { status: 'EXPIRED' as const, result: null };
    }
    return { status: 'PENDING' as const, result: null };
  }

  async getMobileConfig(token: string) {
    const payload = await this.verifyMobileToken(token);
    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id: payload.kioskId },
      select: {
        id: true,
        faceEnabled: true,
        nfcEnabled: true,
        qrEnabled: true,
        companyId: true,
        status: true,
        lastSeenAt: true,
      },
    });
    if (!kiosk) throw new NotFoundException('Kiosk not found');

    const pinSettings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId: kiosk.companyId },
      select: {
        pinFailureThreshold: true,
        pinFailureCooldownSeconds: true,
        allowOfflineSync: true,
        offlineSyncMaxAgeMinutes: true,
      },
    });

    return {
      kioskId: kiosk.id,
      status: kiosk.status,
      lastSeenAt: kiosk.lastSeenAt,
      features: this.buildKioskFeatures(kiosk, pinSettings),
    };
  }

  private buildKioskFeatures(
    kiosk: { faceEnabled: boolean; nfcEnabled: boolean; qrEnabled: boolean },
    pinSettings:
      | {
          pinFailureThreshold: number;
          pinFailureCooldownSeconds: number;
          allowOfflineSync: boolean;
          offlineSyncMaxAgeMinutes: number;
        }
      | null,
  ) {
    return {
      faceEnabled: kiosk.faceEnabled,
      nfcEnabled: kiosk.nfcEnabled,
      qrEnabled: kiosk.qrEnabled,
      pinFailureThreshold: pinSettings?.pinFailureThreshold ?? 3,
      pinFailureCooldownSeconds: pinSettings?.pinFailureCooldownSeconds ?? 30,
      allowOfflineSync: pinSettings?.allowOfflineSync ?? true,
      offlineSyncMaxAgeMinutes: pinSettings?.offlineSyncMaxAgeMinutes ?? 720,
    };
  }

  async verifyMobilePhoto(
    token: string,
    file: Express.Multer.File,
    options?: {
      offlineSync?: boolean;
      capturedAt?: Date;
      idempotencyKey?: string;
      requestId?: string;
      latitude?: number;
      longitude?: number;
    },
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
      await this.assertOfflineSyncPolicy(kiosk.companyId, options?.offlineSync, options?.capturedAt);

      await this.prisma.timeGateKiosk.update({
        where: { id: kiosk.id },
        data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
      });

      const threshold = Number(this.config.get('FACE_VERIFY_THRESHOLD') ?? 0.82);
      const t = Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.82;
      const probe = await this.face.embedFromBuffer(file.buffer);

      // Pool tenant entier : reconnaissance cross-site → REVIEW_REQUIRED dans applyAttendanceFromVerification.
      const employees = await this.prisma.employee.findMany({
        where: {
          status: EmployeeStatus.ACTIVE,
          companyId: kiosk.companyId,
          faceEmbedding: { not: Prisma.DbNull },
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
        throw new BadRequestException('No enrolled employees available for this organization');
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
          occurredAt: options?.capturedAt ?? new Date(),
          authMethod: TimeGateAttendanceAuthMethod.FACE,
          latitude: options?.latitude,
          longitude: options?.longitude,
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
    if (options?.offlineSync) {
      throw new BadRequestException('Le pointage PIN necessite une connexion en ligne');
    }
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

    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        status: EmployeeStatus.ACTIVE,
        companyId: kiosk.companyId,
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
      occurredAt: options?.capturedAt ?? new Date(),
      authMethod: TimeGateAttendanceAuthMethod.PIN,
      latitude: dto.latitude,
      longitude: dto.longitude,
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

  async verifyMobileNfc(
    token: string,
    dto: MobileVerifyNfcDto,
    options?: { idempotencyKey?: string; requestId?: string; offlineSync?: boolean; capturedAt?: Date },
  ) {
    const badgeUid = this.normalizeNfcBadgeUid(dto.badgeUid);
    if (badgeUid.length < 4) {
      throw new BadRequestException('Identifiant de badge invalide');
    }

    const payload = await this.verifyMobileToken(token);
    this.compactVerifyIdempotencyCache();
    const idempotencyKey = options?.idempotencyKey?.trim();
    const idempotencyCacheKey = idempotencyKey ? `${payload.kioskId}:nfc:${idempotencyKey}` : null;
    if (idempotencyCacheKey) {
      const cached = this.verifyIdempotencyCache.get(idempotencyCacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.response;
      }
    }

    const kiosk = await this.prisma.timeGateKiosk.findUnique({
      where: { id: payload.kioskId },
      select: { id: true, companyId: true, branchId: true, nfcEnabled: true },
    });
    if (!kiosk) throw new NotFoundException('Kiosk not found');
    if (!kiosk.nfcEnabled) {
      throw new ForbiddenException('Pointage NFC desactive sur cette borne');
    }

    await this.prisma.timeGateKiosk.update({
      where: { id: kiosk.id },
      data: { lastSeenAt: new Date(), status: KioskStatus.ONLINE },
    });

    const employee = await this.prisma.employee.findFirst({
      where: {
        status: EmployeeStatus.ACTIVE,
        companyId: kiosk.companyId,
        nfcBadgeUid: badgeUid,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeName: true,
      },
    });
    if (!employee) {
      throw new UnauthorizedException('Badge NFC non reconnu');
    }

    return this.finalizeCredentialVerification({
      kiosk,
      employee,
      authMethod: TimeGateAttendanceAuthMethod.NFC,
      logMessage: `NFC:${badgeUid}`,
      idempotencyKey,
      idempotencyCacheKey,
      offlineSync: options?.offlineSync,
      capturedAt: options?.capturedAt,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  private normalizeNfcBadgeUid(raw: string): string {
    return raw.replace(/[\s:-]/g, '').toUpperCase();
  }

  private async finalizeCredentialVerification(params: {
    kiosk: { id: string; companyId: string; branchId: string };
    employee: { id: string; firstName: string | null; lastName: string | null; employeeName: string };
    authMethod: TimeGateAttendanceAuthMethod;
    logMessage: string;
    idempotencyKey?: string;
    idempotencyCacheKey: string | null;
    offlineSync?: boolean;
    capturedAt?: Date;
    latitude?: number;
    longitude?: number;
  }): Promise<VerifyMobileResult> {
    await this.assertOfflineSyncPolicy(params.kiosk.companyId, params.offlineSync, params.capturedAt);
    const firstName = params.employee.firstName ?? params.employee.employeeName;
    const lastName = params.employee.lastName ?? '';
    const log = await this.prisma.faceRecognitionLog.create({
      data: {
        id: generateDocId('FRL'),
        kioskId: params.kiosk.id,
        branchId: params.kiosk.branchId,
        companyId: params.kiosk.companyId,
        employeeId: params.employee.id,
        employeeName: `${firstName} ${lastName}`.trim(),
        success: true,
        confidence: 1,
        message: params.logMessage,
        isOfflineSync: Boolean(params.offlineSync),
        capturedAt: params.capturedAt,
        idempotencyKey: params.idempotencyKey ?? undefined,
      },
      select: { id: true, success: true, confidence: true, photo: true, createdAt: true },
    });

    const attendanceMessage = await this.applyAttendanceFromVerification({
      employeeId: params.employee.id,
      kioskId: params.kiosk.id,
      branchId: params.kiosk.branchId,
      companyId: params.kiosk.companyId,
      confidence: 1,
      verificationRef: log.id,
      source: params.offlineSync
        ? TimeGateAttendanceEventSource.KIOSK_OFFLINE_SYNC
        : TimeGateAttendanceEventSource.KIOSK_ONLINE,
      occurredAt: params.capturedAt ?? new Date(),
      authMethod: params.authMethod,
      latitude: params.latitude,
      longitude: params.longitude,
    });
    const birthdayMessage = await this.buildBirthdayMessage(params.employee.id);
    const message = [`Bienvenue ${firstName} ${lastName}`.trim(), attendanceMessage, birthdayMessage]
      .filter(Boolean)
      .join(' | ');

    const response: VerifyMobileResult = {
      success: true,
      confidence: 1,
      message,
      offlineSync: Boolean(params.offlineSync),
      capturedAt: params.capturedAt?.toISOString() ?? null,
      employee: { id: params.employee.id, firstName, lastName },
      log: {
        id: log.id,
        success: log.success,
        confidence: log.confidence ? Number(log.confidence) : 1,
        imageUrl: log.photo,
        createdAt: log.createdAt,
      },
    };

    if (params.idempotencyCacheKey) {
      this.verifyIdempotencyCache.set(params.idempotencyCacheKey, {
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

  private async assertOfflineSyncPolicy(
    companyId: string,
    offlineSync?: boolean,
    capturedAt?: Date,
  ) {
    if (!offlineSync) return;
    const settings = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      select: { allowOfflineSync: true, offlineSyncMaxAgeMinutes: true },
    });
    if (settings?.allowOfflineSync === false) {
      throw new BadRequestException('Synchronisation offline desactivee pour cette organisation');
    }
    if (!capturedAt || Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('capturedAt est requis pour la synchronisation offline');
    }
    const maxAgeMinutes = settings?.offlineSyncMaxAgeMinutes ?? 720;
    const ageMs = Date.now() - capturedAt.getTime();
    if (ageMs < 0) {
      throw new BadRequestException('capturedAt invalide (futur)');
    }
    if (ageMs > maxAgeMinutes * 60_000) {
      throw new BadRequestException('Evenement offline trop ancien pour etre synchronise');
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
    occurredAt?: Date;
    authMethod?: TimeGateAttendanceAuthMethod;
    latitude?: number;
    longitude?: number;
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
    if (
      params.latitude != null &&
      params.longitude != null &&
      Number.isFinite(params.latitude) &&
      Number.isFinite(params.longitude)
    ) {
      const employeeBranch = await this.prisma.branch.findUnique({
        where: { id: employee.branchId },
        select: { id: true, branchName: true, latitude: true, longitude: true, checkinRadius: true },
      });
      if (employeeBranch?.latitude != null && employeeBranch.longitude != null) {
        const inRange = isWithinBranchRadius(
          params.latitude,
          params.longitude,
          Number(employeeBranch.latitude),
          Number(employeeBranch.longitude),
          employeeBranch.checkinRadius,
        );
        if (!inRange) {
          const msg = `Hors perimetre site (${employeeBranch.branchName}). Pointage refuse.`;
          await this.punchAttemptLog.logAttempt({
            companyId: params.companyId,
            employeeId: params.employeeId,
            branchId: params.branchId,
            kioskId: params.kioskId,
            source: params.source,
            authMethod: params.authMethod,
            outcome: 'REJECTED',
            message: msg,
            occurredAt: params.occurredAt ?? new Date(),
          });
          return msg;
        }
      }
    }

    const occurredAt = params.occurredAt ?? new Date();
    const windows = await this.punchWindows.resolveForEmployee(params.employeeId, occurredAt);
    if (!windows) {
      return this.applyLegacyAttendanceFromVerification(params, occurredAt, employee.branchId);
    }

    const dayStart = new Date(occurredAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(occurredAt);
    dayEnd.setHours(23, 59, 59, 999);

    const todaysEvents = await this.prisma.timeGateAttendanceEvent.findMany({
      where: {
        employeeId: params.employeeId,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        occurredAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { occurredAt: 'asc' },
      select: { type: true, occurredAt: true },
    });

    const state = buildDayPunchStateFromEvents(todaysEvents);
    const resolution = resolveAttendancePunch(
      dateToMinutes(occurredAt),
      windows,
      state,
    );

    if (resolution.action === 'REJECTED') {
      await this.punchAttemptLog.logAttempt({
        companyId: params.companyId,
        employeeId: params.employeeId,
        branchId: params.branchId,
        kioskId: params.kioskId,
        source: params.source,
        authMethod: params.authMethod,
        outcome: 'REJECTED',
        message: resolution.message,
        occurredAt,
      });
      if (this.isOutsideWindowAttemptMessage(resolution.message)) {
        const employeeName =
          `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
          employee.employeeName;
        await this.notifications.notifyOutsideWindowAttempt({
          companyId: params.companyId,
          branchId: params.branchId,
          employeeId: params.employeeId,
          employeeName,
          occurredAt,
          reason: resolution.message,
        });
      }
      return resolution.message;
    }

    if (resolution.action === 'NONE') {
      return resolution.message;
    }

    const wrongSite = employee.branchId !== params.branchId;
    const messages: string[] = [];

    if (
      resolution.action === 'CHECK_OUT' &&
      resolution.inferBreakEnd &&
      windows.breakEndMin != null
    ) {
      const breakEndAt = new Date(occurredAt);
      breakEndAt.setHours(Math.floor(windows.breakEndMin / 60), windows.breakEndMin % 60, 0, 0);
      const breakResult = await this.punchRecorder.recordEvent({
        ...params,
        occurredAt: breakEndAt,
        eventType: TimeGateAttendanceEventType.BREAK_END,
        employeeBranchId: employee.branchId,
        wrongSite,
        idempotencySuffix: 'break_end_inferred',
      });
      messages.push(breakResult.message);
    }

    const mainResult = await this.punchRecorder.recordEvent({
      ...params,
      occurredAt,
      eventType:
        resolution.action === 'CHECK_IN'
          ? TimeGateAttendanceEventType.CHECK_IN
          : resolution.action === 'BREAK_END'
            ? TimeGateAttendanceEventType.BREAK_END
            : TimeGateAttendanceEventType.CHECK_OUT,
      employeeBranchId: employee.branchId,
      wrongSite,
      lateAbsent: resolution.action === 'CHECK_IN' ? resolution.lateAbsent : undefined,
      idempotencySuffix: resolution.action.toLowerCase(),
    });
    messages.push(mainResult.message);

    return messages.filter(Boolean).join(' ');
  }

  private isOutsideWindowAttemptMessage(message: string): boolean {
    const m = message.toLowerCase();
    return (
      m.includes('hors fenêtre') ||
      m.includes('hors fenetre') ||
      m.includes('trop tôt') ||
      m.includes('trop tot') ||
      m.includes('départ anticipé') ||
      m.includes('depart anticipe')
    );
  }

  private async recordPunchEvent(params: {
    employeeId: string;
    kioskId: string;
    branchId: string;
    companyId: string;
    confidence: number;
    verificationRef?: string;
    source?: TimeGateAttendanceEventSource;
    occurredAt: Date;
    eventType: TimeGateAttendanceEventType;
    employeeBranchId: string;
    wrongSite: boolean;
    lateAbsent?: boolean;
    idempotencySuffix: string;
    authMethod?: TimeGateAttendanceAuthMethod;
  }): Promise<string> {
    const result = await this.punchRecorder.recordEvent({
      ...params,
      wrongSite: params.wrongSite,
    });
    return result.message;
  }

  private async applyLegacyAttendanceFromVerification(
    params: {
      employeeId: string;
      kioskId: string;
      branchId: string;
      companyId: string;
      confidence: number;
      verificationRef?: string;
      source?: TimeGateAttendanceEventSource;
      authMethod?: TimeGateAttendanceAuthMethod;
    },
    occurredAt: Date,
    employeeBranchId: string,
  ): Promise<string> {
    const dayStart = new Date(occurredAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(occurredAt);
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

    return this.recordPunchEvent({
      ...params,
      occurredAt,
      eventType,
      employeeBranchId,
      wrongSite: employeeBranchId !== params.branchId,
      idempotencySuffix: decision.kind.toLowerCase(),
    });
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

      const kiosk = await this.prisma.timeGateKiosk.findUnique({
        where: { id: payload.kioskId },
        select: { deviceToken: true, isActive: true },
      });
      if (!kiosk?.isActive) {
        throw new UnauthorizedException('Kiosk inactive or not found');
      }
      if (kiosk.deviceToken) {
        const hash = createHash('sha256').update(token).digest('hex');
        if (kiosk.deviceToken !== hash) {
          throw new UnauthorizedException(
            'This kiosk is bound to another device. Reconfigure from the admin app.',
          );
        }
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
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
