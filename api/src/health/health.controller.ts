import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liveness / readiness',
    description:
      'Répond 200 si le process et la base sont OK. 503 si la DB est injoignable.',
  })
  async check(@Res({ passthrough: true }) res: Response) {
    const started = process.uptime();
    let database: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    const ok = database === 'up';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ok ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(started),
      timestamp: new Date().toISOString(),
    };
  }
}
