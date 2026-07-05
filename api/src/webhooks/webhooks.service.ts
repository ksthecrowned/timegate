import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(companyId: string, event: string, payload: Record<string, unknown>) {
    const cfg = await this.prisma.timeGateSystemSettings.findUnique({
      where: { companyId },
      select: { webhookEnabled: true, webhookUrl: true, webhookSecret: true },
    });
    if (!cfg?.webhookEnabled || !cfg.webhookUrl || !cfg.webhookSecret) return;

    const timestamp = new Date().toISOString();
    const bodyObj = {
      id: randomUUID(),
      event,
      timestamp,
      companyId,
      payload,
    };
    const body = JSON.stringify(bodyObj);
    const signature = createHmac('sha256', cfg.webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-timegate-event': event,
          'x-timegate-timestamp': timestamp,
          'x-timegate-signature': `sha256=${signature}`,
        },
        body,
      });
      if (!res.ok) {
        this.logger.warn(`Webhook delivery failed [${event}] status=${res.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `Webhook delivery error [${event}]: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
