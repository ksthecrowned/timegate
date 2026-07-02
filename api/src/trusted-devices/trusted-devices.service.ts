import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TimeGateDevicePlatform,
  TimeGateTrustedDeviceStatus,
  TimeGateUserRole,
} from '@prisma/client';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { PrismaService } from '../prisma/prisma.service';

export type DeviceTrustLevel = 'TRUSTED' | 'PENDING';

export type RegisterDeviceParams = {
  userId: string;
  deviceInstallId: string;
  platform: TimeGateDevicePlatform;
  deviceLabel?: string;
};

@Injectable()
export class TrustedDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerOnLogin(params: RegisterDeviceParams): Promise<{
    status: TimeGateTrustedDeviceStatus;
    trust: DeviceTrustLevel;
  }> {
    const installId = params.deviceInstallId.trim();
    const existing = await this.prisma.timeGateTrustedDevice.findUnique({
      where: {
        userId_deviceInstallId: { userId: params.userId, deviceInstallId: installId },
      },
    });

    if (existing) {
      if (existing.status === TimeGateTrustedDeviceStatus.REVOKED) {
        throw new ForbiddenException({
          message: 'Cet appareil a été révoqué. Contactez votre administrateur.',
          code: 'DEVICE_REVOKED',
        });
      }
      await this.prisma.timeGateTrustedDevice.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          platform: params.platform,
          ...(params.deviceLabel ? { deviceLabel: params.deviceLabel } : {}),
        },
      });
      return {
        status: existing.status,
        trust: this.toTrustLevel(existing.status),
      };
    }

    const otherTrustedOnDevice = await this.prisma.timeGateTrustedDevice.count({
      where: {
        deviceInstallId: installId,
        status: TimeGateTrustedDeviceStatus.TRUSTED,
        userId: { not: params.userId },
      },
    });

    let status: TimeGateTrustedDeviceStatus;
    if (otherTrustedOnDevice > 0) {
      status = TimeGateTrustedDeviceStatus.PENDING;
    } else {
      const userTrustedCount = await this.prisma.timeGateTrustedDevice.count({
        where: {
          userId: params.userId,
          status: TimeGateTrustedDeviceStatus.TRUSTED,
        },
      });
      status =
        userTrustedCount === 0
          ? TimeGateTrustedDeviceStatus.TRUSTED
          : TimeGateTrustedDeviceStatus.PENDING;
    }

    const now = new Date();
    await this.prisma.timeGateTrustedDevice.create({
      data: {
        id: generateDocId('TDV'),
        userId: params.userId,
        deviceInstallId: installId,
        platform: params.platform,
        deviceLabel: params.deviceLabel,
        status,
        trustedAt: status === TimeGateTrustedDeviceStatus.TRUSTED ? now : null,
        lastSeenAt: now,
      },
    });

    return { status, trust: this.toTrustLevel(status) };
  }

  async assertTrusted(user: JwtUser): Promise<void> {
    if (user.role !== TimeGateUserRole.EMPLOYEE) return;
    if (!user.deviceInstallId) {
      throw new ForbiddenException({
        message: 'Appareil non identifié. Reconnectez-vous depuis l’application employé.',
        code: 'DEVICE_NOT_TRUSTED',
      });
    }
    const row = await this.prisma.timeGateTrustedDevice.findUnique({
      where: {
        userId_deviceInstallId: {
          userId: user.sub,
          deviceInstallId: user.deviceInstallId,
        },
      },
      select: { status: true },
    });
    if (!row || row.status !== TimeGateTrustedDeviceStatus.TRUSTED) {
      throw new ForbiddenException({
        message:
          'Appareil en attente de validation. Les actions de pointage sont indisponibles.',
        code: 'DEVICE_NOT_TRUSTED',
      });
    }
  }

  async listForEmployee(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { userId: true },
    });
    if (!employee?.userId) return { data: [] };
    return { data: await this.listForUser(employee.userId) };
  }

  async listPending(companyId: string) {
    const rows = await this.prisma.timeGateTrustedDevice.findMany({
      where: {
        status: TimeGateTrustedDeviceStatus.PENDING,
        user: {
          companyId,
          timeGateRole: TimeGateUserRole.EMPLOYEE,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeName: true,
              },
            },
          },
        },
      },
    });

    const installIds = [...new Set(rows.map((r) => r.deviceInstallId))];
    const sharedCounts = await Promise.all(
      installIds.map(async (installId) => ({
        installId,
        count: await this.prisma.timeGateTrustedDevice.count({
          where: { deviceInstallId: installId },
        }),
      })),
    );
    const sharedMap = new Map(sharedCounts.map((s) => [s.installId, s.count > 1]));

    return {
      data: rows.map((row) => this.toApiShape(row, sharedMap.get(row.deviceInstallId) ?? false)),
    };
  }

  async updateStatus(
    deviceId: string,
    companyId: string,
    status: 'TRUSTED' | 'REVOKED',
  ) {
    const row = await this.prisma.timeGateTrustedDevice.findFirst({
      where: {
        id: deviceId,
        user: { companyId, timeGateRole: TimeGateUserRole.EMPLOYEE },
      },
    });
    if (!row) throw new NotFoundException('Appareil introuvable');

    const nextStatus =
      status === 'TRUSTED'
        ? TimeGateTrustedDeviceStatus.TRUSTED
        : TimeGateTrustedDeviceStatus.REVOKED;

    const updated = await this.prisma.timeGateTrustedDevice.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        trustedAt: nextStatus === TimeGateTrustedDeviceStatus.TRUSTED ? new Date() : row.trustedAt,
      },
    });

    const shared = await this.isSharedDevice(updated.deviceInstallId);
    return this.toApiShape(updated, shared);
  }

  async ensurePortalUser(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        id: true,
        personalEmail: true,
        employeeName: true,
        firstName: true,
        userId: true,
      },
    });
    if (!employee) throw new NotFoundException('Employé introuvable');
    if (employee.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: employee.userId },
        select: { id: true, email: true, passwordHash: true },
      });
      return {
        userId: user!.id,
        email: user!.email,
        hasPassword: user!.passwordHash != null,
        created: false,
      };
    }

    const email = employee.personalEmail?.trim().toLowerCase();
    if (!email) {
      throw new ForbiddenException("L'employé doit avoir un e-mail personnel.");
    }

    const existing = await this.prisma.user.findFirst({
      where: { email, companyId },
    });
    if (existing) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { userId: existing.id },
      });
      return {
        userId: existing.id,
        email: existing.email,
        hasPassword: existing.passwordHash != null,
        created: false,
      };
    }

    const user = await this.prisma.user.create({
      data: {
        id: generateDocId('USR'),
        email,
        passwordHash: null,
        timeGateRole: TimeGateUserRole.EMPLOYEE,
        companyId,
        firstName: employee.firstName ?? undefined,
      },
      select: { id: true, email: true },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { userId: user.id },
    });

    return {
      userId: user.id,
      email: user.email,
      hasPassword: false,
      created: true,
    };
  }

  private async listForUser(userId: string) {
    const rows = await this.prisma.timeGateTrustedDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
    return Promise.all(
      rows.map(async (row) => this.toApiShape(row, await this.isSharedDevice(row.deviceInstallId))),
    );
  }

  private async isSharedDevice(deviceInstallId: string) {
    const count = await this.prisma.timeGateTrustedDevice.count({
      where: { deviceInstallId },
    });
    return count > 1;
  }

  private toTrustLevel(status: TimeGateTrustedDeviceStatus): DeviceTrustLevel {
    return status === TimeGateTrustedDeviceStatus.TRUSTED ? 'TRUSTED' : 'PENDING';
  }

  private toApiShape(
    row: {
      id: string;
      deviceInstallId: string;
      platform: TimeGateDevicePlatform;
      deviceLabel: string | null;
      status: TimeGateTrustedDeviceStatus;
      trustedAt: Date | null;
      lastSeenAt: Date;
      createdAt: Date;
      user?: {
        email: string;
        employee: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          employeeName: string;
        } | null;
      };
    },
    shared: boolean,
  ) {
    const emp = row.user?.employee;
    return {
      id: row.id,
      deviceInstallId: row.deviceInstallId,
      platform: row.platform,
      deviceLabel: row.deviceLabel,
      status: row.status,
      trustedAt: row.trustedAt?.toISOString() ?? null,
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      sharedDevice: shared,
      employee: emp
        ? {
            id: emp.id,
            name:
              `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeName,
            email: row.user?.email ?? null,
          }
        : null,
    };
  }
}
