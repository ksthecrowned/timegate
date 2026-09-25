import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

function dbHostFromUrl(url?: string): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    const m = /@([^/:?]+)(?::\d+)?\//.exec(url);
    return m?.[1] ?? null;
  }
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liveness / readiness',
    description:
      'Répond 200 si le process et la base sont OK. 503 si la DB est injoignable. ' +
      'e2eDb=true uniquement si l’API a été démarrée via start:e2e / test:use-cases:e2e.',
  })
  async check(@Res({ passthrough: true }) res: FastifyReply) {
    const started = process.uptime();
    let database: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    const ok = database === 'up';
    void res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ok ? 'ok' : 'degraded',
      database,
      /** True only when process env was set by with-e2e-db / start:e2e. */
      e2eDb: process.env.TIMEGATE_E2E_DB === '1',
      /** Hostname only — never credentials. */
      dbHost: dbHostFromUrl(process.env.DATABASE_URL),
      uptimeSeconds: Math.round(started),
      timestamp: new Date().toISOString(),
    };
  }
}
