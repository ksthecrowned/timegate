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
import { AttendanceType, DeviceStatus, Role, WeekDay } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FaceEmbeddingService } from '../face/face-embedding.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { MobileProvisionDto } from './dto/mobile-provision.dto';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { CreateActivationKeyDto } from './dto/create-activation-key.dto';

type MobileTokenPayload = {
  typ: 'mobile_device';
  deviceId: string;
  siteId: string | null;
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private face: FaceEmbeddingService,
    private readonly storage: CloudflareR2Service,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    return {
      access_token: await this.signToken(user.id, user.email, user.role, user.organizationId ?? null),
    };
  }

  async mobileBootstrap(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    if (user.role !== Role.ADMIN && user.role !== Role.MANAGER) {
      throw new UnauthorizedException('Only ADMIN/MANAGER can provision kiosk devices');
    }

    if (!user.organizationId) {
      throw new UnauthorizedException('Operator account must belong to an organization');
    }

    const sites = await this.prisma.site.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, address: true, timezone: true },
      orderBy: { name: 'asc' },
    });

    return {
      operator_token: await this.signToken(user.id, user.email, user.role, user.organizationId ?? null),
      operator: { id: user.id, email: user.email, role: user.role },
      sites,
    };
  }

  async createUser(dto: CreateUserDto) {
    if (dto.role !== Role.SUPER_ADMIN && !dto.organizationId) {
      throw new BadRequestException('organizationId is required for ADMIN/MANAGER users');
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email.trim().toLowerCase(),
        ...(dto.organizationId ? { organizationId: dto.organizationId } : { organizationId: null }),
      },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password, role: dto.role, organizationId: dto.organizationId ?? null },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return user;
  }

  async activateSubscription(user: JwtUser, dto: ActivateSubscriptionDto) {
    const keyHash = createHash('sha256').update(dto.activationKey.trim()).digest('hex');
    const now = new Date();
    const activation = await this.prisma.activationKey.findUnique({
      where: { keyHash },
      include: { organization: { select: { id: true, sku: true, name: true } } },
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
    if (user.role !== Role.SUPER_ADMIN && activation.organizationId !== user.organizationId) {
      throw new ForbiddenException('Activation key does not belong to your organization');
    }

    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { organizationId: activation.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const [subscription] = await this.prisma.$transaction([
      existingSubscription
        ? this.prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan: activation.plan,
              maxEmployees: activation.maxEmployees,
              maxDevices: activation.maxDevices,
              expiresAt: activation.expiresAt,
            },
          })
        : this.prisma.subscription.create({
            data: {
              organizationId: activation.organizationId,
              plan: activation.plan,
              maxEmployees: activation.maxEmployees,
              maxDevices: activation.maxDevices,
              expiresAt: activation.expiresAt,
            },
          }),
      this.prisma.activationKey.update({
        where: { id: activation.id },
        data: { usedAt: now },
      }),
    ]);

    return {
      activated: true,
      organization: activation.organization,
      subscription: {
        plan: subscription.plan,
        maxEmployees: subscription.maxEmployees,
        maxDevices: subscription.maxDevices,
        expiresAt: subscription.expiresAt,
      },
    };
  }

  async listOrganizations() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          select: { id: true, plan: true, maxEmployees: true, maxDevices: true, expiresAt: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        users: {
          select: { id: true, email: true, role: true, createdAt: true },
          where: { role: { in: [Role.ADMIN, Role.MANAGER] } },
          orderBy: { createdAt: 'desc' },
        },
        activationKeys: {
          select: { id: true, plan: true, expiresAt: true, usedAt: true, revokedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async createOrganization(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        sku: dto.sku.trim().toUpperCase(),
      },
    });
  }

  async createOrganizationAdmin(organizationId: string, dto: CreateOrganizationAdminDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const existing = await this.prisma.user.findUnique({
      where: { email_organizationId: { email: dto.email, organizationId } },
    });
    if (existing) {
      throw new ConflictException('Admin email already exists for this organization');
    }
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        password,
        role: Role.ADMIN,
        organizationId,
      },
      select: { id: true, email: true, role: true, organizationId: true, createdAt: true },
    });
  }

  async createActivationKey(organizationId: string, dto: CreateActivationKeyDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const plainKey = `TMGT-${randomBytes(8).toString('hex').toUpperCase()}`;
    const keyHash = createHash('sha256').update(plainKey).digest('hex');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    const created = await this.prisma.activationKey.create({
      data: {
        organizationId,
        keyHash,
        plan: dto.plan,
        maxEmployees: dto.maxEmployees,
        maxDevices: dto.maxDevices,
        expiresAt,
      },
      select: {
        id: true,
        organizationId: true,
        plan: true,
        maxEmployees: true,
        maxDevices: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      activationKey: plainKey,
    };
  }

  async getSubscriptionStatus(user: JwtUser) {
    if (user.role === Role.SUPER_ADMIN) {
      return { active: true, role: user.role, subscription: null };
    }
    if (!user.organizationId) {
      return { active: false, role: user.role, subscription: null };
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        maxEmployees: true,
        maxDevices: true,
        expiresAt: true,
      },
    });
    const active = Boolean(subscription?.expiresAt && subscription.expiresAt > new Date());
    return {
      active,
      role: user.role,
      subscription,
    };
  }

  private signToken(userId: string, email: string, role: string, organizationId: string | null) {
    return this.jwt.signAsync({ sub: userId, email, role, organizationId });
  }

  private async validateCredentials(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const superAdmin = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, role: Role.SUPER_ADMIN, organizationId: null },
    });
    if (superAdmin) {
      const ok = await bcrypt.compare(dto.password, superAdmin.password);
      if (!ok) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return superAdmin;
    }

    if (!dto.sku?.trim()) {
      throw new UnauthorizedException('Organization SKU is required');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { sku: dto.sku.trim().toUpperCase() },
      select: { id: true },
    });
    if (!organization) {
      throw new UnauthorizedException('Invalid organization SKU');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email_organizationId: { email: normalizedEmail, organizationId: organization.id },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async provisionMobile(dto: MobileProvisionDto) {
    const device = dto.deviceId
      ? await this.prisma.device.findUnique({ where: { id: dto.deviceId } })
      : await this.createProvisionedDevice(dto.siteId ?? null, dto.deviceName, dto.location);

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const lifetime_token = await this.jwt.signAsync(
      {
        typ: 'mobile_device',
        deviceId: device.id,
        siteId: device.siteId,
      } satisfies MobileTokenPayload,
      { expiresIn: this.config.get<string>('MOBILE_LIFETIME_TOKEN_EXPIRES_IN') ?? '100y' },
    );

    return {
      lifetime_token,
      device: {
        id: device.id,
        name: device.name,
        siteId: device.siteId,
      },
    };
  }

  async verifyMobilePhoto(token: string, file: Express.Multer.File) {
    const verifyId = randomBytes(4).toString('hex');
    const startedAt = Date.now();
    console.log(
      `[TimeGateAPI][verify:${verifyId}] start photoSize=${file?.size ?? 0} mime=${file?.mimetype ?? 'unknown'}`,
    );
    this.logger.log(
      `[verify:${verifyId}] mobile verify requested (photoSize=${file?.size ?? 0} bytes, mimetype=${file?.mimetype ?? 'unknown'})`,
    );

    try {
      const payload = await this.verifyMobileToken(token);
      this.logger.log(`[verify:${verifyId}] token validated for device=${payload.deviceId}`);
      if (!file?.buffer?.length) {
        throw new BadRequestException('Empty file');
      }

      const device = await this.prisma.device.findUnique({ where: { id: payload.deviceId } });
      if (!device) {
        throw new NotFoundException('Device not found');
      }
      this.logger.log(
        `[verify:${verifyId}] device loaded (id=${device.id}, siteId=${device.siteId ?? 'none'}, org=${device.organizationId})`,
      );

      const threshold = Number(this.config.get('FACE_VERIFY_THRESHOLD') ?? 0.82);
      const t = Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.82;
      const probe = await this.face.embedFromBuffer(file.buffer);
      this.logger.log(`[verify:${verifyId}] probe embedding generated (vectorLength=${probe.length}, threshold=${t})`);

      const employees = await this.prisma.employee.findMany({
        where: {
          isActive: true,
          organizationId: device.organizationId,
          ...(device.siteId ? { siteId: device.siteId } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          faceEmbedding: true,
        },
        take: 500,
      });
      if (!employees.length) {
        throw new BadRequestException('No enrolled employees available for this device/site');
      }

      const concurrency = Number(this.config.get('MOBILE_VERIFY_CONCURRENCY') ?? 6);
      const workerCount = Number.isFinite(concurrency) && concurrency > 0 ? Math.min(20, Math.floor(concurrency)) : 6;
      this.logger.log(`[verify:${verifyId}] matching started (employees=${employees.length}, workers=${workerCount})`);
      let nextIndex = 0;

      const worker = async (): Promise<MatchCandidate | null> => {
        let localBest: MatchCandidate | null = null;
        while (true) {
          const index = nextIndex++;
          if (index >= employees.length) return localBest;
          const employee = employees[index];
          const enrolled = this.toVector(employee.faceEmbedding);
          if (!enrolled) continue;
          const similarity = this.face.cosineSimilarity(probe, enrolled);
          if (similarity < t) continue;

          const candidate: MatchCandidate = {
            employeeId: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            similarity,
          };

          const candidateScore = candidate.similarity;
          const localBestScore = localBest?.similarity ?? 0;
          if (!localBest || candidateScore > localBestScore) {
            localBest = candidate;
          }
        }
      };

      const candidates = await Promise.all(Array.from({ length: workerCount }, () => worker()));
      const matched = candidates.reduce<MatchCandidate | null>((best, candidate) => {
        if (!candidate) return best;
        const candidateScore = candidate.similarity;
        const bestScore = best?.similarity ?? 0;
        return !best || candidateScore > bestScore ? candidate : best;
      }, null);
      const success = Boolean(matched);
      const confidence = matched?.similarity ?? null;
      let imageUrl: string | null = null;
      try {
        imageUrl = await this.storage.uploadRecognitionImage({
          organizationId: device.organizationId,
          deviceId: device.id,
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

      const log = await this.prisma.recognitionLog.create({
        data: {
          employeeId: matched?.employeeId ?? null,
          deviceId: device.id,
          organizationId: device.organizationId,
          success,
          confidence: confidence ?? undefined,
          imageUrl: imageUrl ?? undefined,
        },
        select: { id: true, success: true, confidence: true, imageUrl: true, createdAt: true },
      });
      this.logger.log(
        `[verify:${verifyId}] completed success=${success} confidence=${confidence ?? 'n/a'} logId=${log.id} in ${Date.now() - startedAt}ms`,
      );
      console.log(
        `[TimeGateAPI][verify:${verifyId}] done success=${success} confidence=${confidence ?? 'n/a'} elapsedMs=${Date.now() - startedAt}`,
      );

      let attendanceMessage: string | null = null;
      let birthdayMessage: string | null = null;
      if (success && matched) {
        attendanceMessage = await this.applyAttendanceFromVerification({
          employeeId: matched.employeeId,
          deviceId: device.id,
          organizationId: device.organizationId,
          confidence: confidence ?? 1,
        });
        birthdayMessage = await this.buildBirthdayMessage(matched.employeeId);
      }

      const welcomeMessage = success ? `Bienvenue ${matched!.firstName} ${matched!.lastName}` : 'Visage non reconnu';
      const message = [welcomeMessage, attendanceMessage, birthdayMessage].filter(Boolean).join(' | ');

      return {
        success,
        confidence,
        message,
        employee: success
          ? {
              id: matched!.employeeId,
              firstName: matched!.firstName,
              lastName: matched!.lastName,
            }
          : null,
        log,
      };
    } catch (error) {
      console.log(
        `[TimeGateAPI][verify:${verifyId}] error elapsedMs=${Date.now() - startedAt} message=${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.error(
        `[verify:${verifyId}] failed after ${Date.now() - startedAt}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private async applyAttendanceFromVerification(params: {
    employeeId: string;
    deviceId: string;
    organizationId: string;
    confidence: number;
  }): Promise<string> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: params.employeeId },
      include: {
        schedule: { include: { workDays: true } },
        site: { select: { id: true, timezone: true } },
      },
    });
    if (!employee) {
      return 'Employe introuvable pour le pointage.';
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const isHoliday = await this.prisma.holiday.findFirst({
      where: {
        organizationId: params.organizationId,
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, name: true },
    });
    if (isHoliday) {
      return `Aucun pointage enregistre: jour ferie (${isHoliday.name}).`;
    }

    const effectiveSchedule =
      employee.schedule ??
      (await this.prisma.workSchedule.findFirst({
        where: { siteId: employee.siteId, organizationId: params.organizationId },
        include: { workDays: true },
        orderBy: { createdAt: 'asc' },
      }));

    if (!effectiveSchedule) {
      return "Aucun planning associe. Le pointage n'a pas ete enregistre.";
    }

    const weekday = this.weekDayFromDate(now);
    const dayRule = effectiveSchedule.workDays.find((d) => d.day === weekday);
    if (!dayRule) {
      return "Aucun service prevu aujourd'hui (jour off).";
    }

    const startMinutes = this.timeToMinutes(dayRule.startTime);
    const endMinutes = this.timeToMinutes(dayRule.endTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const earliestCheckIn = startMinutes - 120;

    const todaysAttendances = await this.prisma.attendance.findMany({
      where: {
        employeeId: params.employeeId,
        timestamp: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true, type: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });
    const hasCheckIn = todaysAttendances.some((a) => a.type === AttendanceType.CHECK_IN);
    const hasCheckOut = todaysAttendances.some((a) => a.type === AttendanceType.CHECK_OUT);

    const decision = this.decideAttendance({
      nowMinutes,
      startMinutes,
      endMinutes,
      earliestCheckIn,
      hasCheckIn,
      hasCheckOut,
    });

    if (decision.kind === 'NONE') {
      return decision.message;
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId: params.employeeId,
        deviceId: params.deviceId,
        organizationId: params.organizationId,
        type: decision.kind,
        confidence: params.confidence,
        timestamp: now,
      },
    });

    if (decision.kind === 'CHECK_IN') {
      const latenessMinutes = nowMinutes - (startMinutes + (effectiveSchedule.lateGraceMinutes ?? 0));
      if (latenessMinutes > 0) {
        const hasLate = await this.prisma.lateRecord.findFirst({
          where: {
            employeeId: params.employeeId,
            date: { gte: dayStart, lte: dayEnd },
          },
          select: { id: true },
        });
        if (!hasLate) {
          await this.prisma.lateRecord.create({
            data: {
              employeeId: params.employeeId,
              organizationId: params.organizationId,
              attendanceId: attendance.id,
              date: now,
              latenessMinutes,
              justified: false,
            },
          });
        }
        return `${decision.message} Retard detecte: ${latenessMinutes} min.`;
      }
    }

    return decision.message;
  }

  private decideAttendance(params: {
    nowMinutes: number;
    startMinutes: number;
    endMinutes: number;
    earliestCheckIn: number;
    hasCheckIn: boolean;
    hasCheckOut: boolean;
  }): AttendanceDecision {
    const formatHm = (minutes: number) => {
      const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
      const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
      const mm = String(normalized % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    if (params.nowMinutes >= params.endMinutes) {
      if (params.hasCheckOut) {
        return { kind: 'NONE', message: 'Pointage de fin deja enregistre pour aujourd\'hui.' };
      }
      return { kind: 'CHECK_OUT', message: 'Pointage de fin enregistre.' };
    }

    if (params.nowMinutes < params.earliestCheckIn) {
      return {
        kind: 'NONE',
        message: `Pointage d'arrivee autorise a partir de ${formatHm(params.earliestCheckIn)}.`,
      };
    }

    if (params.hasCheckIn) {
      return { kind: 'NONE', message: "Pointage d'arrivee deja enregistre pour aujourd'hui." };
    }

    return { kind: 'CHECK_IN', message: "Pointage d'arrivee enregistre." };
  }

  private weekDayFromDate(date: Date): WeekDay {
    const map: WeekDay[] = [
      WeekDay.SUNDAY,
      WeekDay.MONDAY,
      WeekDay.TUESDAY,
      WeekDay.WEDNESDAY,
      WeekDay.THURSDAY,
      WeekDay.FRIDAY,
      WeekDay.SATURDAY,
    ];
    return map[date.getDay()];
  }

  private timeToMinutes(value: string): number {
    const [h, m] = value.split(':');
    const hours = Number(h);
    const minutes = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return hours * 60 + minutes;
  }

  private async buildBirthdayMessage(employeeId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, birthDate: true, whatsappPhone: true },
    });
    if (!employee?.birthDate) return null;
    const today = new Date();
    if (
      employee.birthDate.getDate() === today.getDate() &&
      employee.birthDate.getMonth() === today.getMonth()
    ) {
      if (employee.whatsappPhone) {
        this.logger.log(
          `[birthday] WhatsApp enqueue simulated for employee=${employeeId} to=${employee.whatsappPhone}`,
        );
      }
      return `Joyeux anniversaire ${employee.firstName} !`;
    }
    return null;
  }

  private async verifyMobileToken(token: string): Promise<MobileTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<MobileTokenPayload>(token);
      if (payload?.typ !== 'mobile_device' || !payload.deviceId) {
        throw new UnauthorizedException('Invalid mobile token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid mobile token');
    }
  }

  private async createProvisionedDevice(
    siteId: string | null,
    deviceName: string | undefined,
    location: string | undefined,
  ) {
    if (!siteId) {
      throw new BadRequestException('Missing siteId for new device creation.');
    }
    const name = deviceName?.trim() || `Kiosk-${Date.now().toString().slice(-6)}`;
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return this.prisma.device.create({
      data: {
        name,
        siteId,
        organizationId: site.organizationId,
        apiKey: randomBytes(24).toString('hex'),
        location: location?.trim() || 'Mobile app',
        status: DeviceStatus.ONLINE,
      },
    });
  }

  private toVector(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    const vector = value.filter((v): v is number => typeof v === 'number');
    return vector.length ? vector : null;
  }
}
