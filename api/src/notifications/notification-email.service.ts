import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM') ?? '"TimeGate" <no-reply@timegate.app>';
    const host = this.config.get<string>('MAIL_HOST');
    if (!host) {
      this.logger.warn('[mail:dev] MAIL_HOST not set — notification emails will be logged.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('MAIL_PORT') ?? '587'),
      secure: this.config.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendNotificationEmail(params: {
    to: string[];
    title: string;
    body: string;
    type: string;
  }) {
    if (params.to.length === 0) return;
    const subject = `TimeGate — ${params.title}`;
    const text = `${params.body}\n\nType: ${params.type}\n— TimeGate`;
    const html =
      `<p>${params.body}</p>` +
      `<p style="color:#6b7280;font-size:12px;">Type: ${params.type}</p>` +
      `<p>— TimeGate</p>`;

    if (!this.transporter) {
      this.logger.log(`[mail:dev] notif ${params.type} -> ${params.to.join(', ')} :: ${params.title}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: params.to.join(', '),
      subject,
      text,
      html,
    });
  }
}
