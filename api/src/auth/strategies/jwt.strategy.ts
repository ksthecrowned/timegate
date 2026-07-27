import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_ADMIN } from '../../common/constants/platform-admin';
import { JwtUser } from '../../common/decorators/current-user.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  kind?: 'admin' | 'user';
  companyId: string | null;
  deviceInstallId?: string;
  deviceTrust?: 'TRUSTED' | 'PENDING';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (payload.kind === 'admin' || payload.role === PLATFORM_ADMIN) {
      const admin = await this.prisma.admin.findUnique({ where: { id: payload.sub } });
      if (!admin || !admin.enabled) {
        throw new UnauthorizedException();
      }
      return {
        sub: admin.id,
        email: admin.email,
        kind: 'admin',
        role: PLATFORM_ADMIN,
        companyId: null,
        employeeId: null,
        deviceInstallId: payload.deviceInstallId ?? null,
        deviceTrust: payload.deviceTrust ?? undefined,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { employee: { select: { id: true } } },
    });
    if (!user || !user.timeGateRole || !user.enabled) {
      throw new UnauthorizedException();
    }
    return {
      sub: user.id,
      email: user.email,
      kind: 'user',
      role: user.timeGateRole,
      // Trust DB only — never prefer JWT companyId claims.
      companyId: user.companyId,
      employeeId: user.employee?.id ?? null,
      deviceInstallId: payload.deviceInstallId ?? null,
      deviceTrust: payload.deviceTrust ?? undefined,
    };
  }
}
