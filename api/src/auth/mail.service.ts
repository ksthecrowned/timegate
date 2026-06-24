import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      '"TimeGate" <no-reply@timegate.app>';

    const host = this.config.get<string>('MAIL_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('MAIL_PORT') ?? '587'),
        secure: this.config.get<string>('MAIL_SECURE') === 'true',
        auth: {
          user: this.config.get<string>('MAIL_USER'),
          pass: this.config.get<string>('MAIL_PASS'),
        },
      });
      this.logger.log(
        `MailService ready (smtp://${this.config.get('MAIL_USER')}@${host})`,
      );
    } else {
      this.logger.warn(
        '[mail:dev] MAIL_HOST not set — OTP codes will be logged to this console instead of being emailed. Set MAIL_HOST/MAIL_USER/MAIL_PASS/MAIL_FROM in .env to enable real SMTP.',
      );
    }
  }

  /** Send a 6-digit OTP code for password reset. Falls back to logger in dev. */
  async sendOtpEmail(params: {
    to: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    const { to, code, expiresInMinutes } = params;
    const subject = 'TimeGate — Réinitialisation de votre mot de passe';
    const text =
      `Bonjour,\n\n` +
      `Vous avez demandé la réinitialisation de votre mot de passe TimeGate.\n\n` +
      `Votre code de vérification : ${code}\n\n` +
      `Ce code expire dans ${expiresInMinutes} minutes.\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n` +
      `— L'équipe TimeGate`;
    const html =
      `<p>Bonjour,</p>` +
      `<p>Vous avez demandé la réinitialisation de votre mot de passe TimeGate.</p>` +
      `<p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:24px 0;">${code}</p>` +
      `<p>Ce code expire dans <strong>${expiresInMinutes} minutes</strong>.</p>` +
      `<p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>` +
      `<p>— L'équipe TimeGate</p>`;

    if (!this.transporter) {
      this.logger.warn(`[mail:dev] OTP for ${to} → ${code} (expires in ${expiresInMinutes} min)`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }

  async sendPasswordChangedEmail(params: { to: string }): Promise<void> {
    const { to } = params;
    const subject = 'TimeGate — Votre mot de passe a été modifié';
    const text =
      `Bonjour,\n\n` +
      `Votre mot de passe TimeGate a été modifié avec succès.\n\n` +
      `Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement votre administrateur.\n\n` +
      `— L'équipe TimeGate`;
    const html =
      `<p>Bonjour,</p>` +
      `<p>Votre mot de passe TimeGate a été modifié avec succès.</p>` +
      `<p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement votre administrateur.</p>` +
      `<p>— L'équipe TimeGate</p>`;

    if (!this.transporter) {
      this.logger.log(`[mail:dev] password-changed notification for ${to}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text, html });
  }
}
