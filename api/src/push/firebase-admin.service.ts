import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export type FcmPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim();
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON absent — push FCM désactivé');
      return;
    }

    try {
      const credentials = JSON.parse(raw) as Parameters<typeof cert>[0];
      this.app = getApps().length > 0 ? getApps()[0]! : initializeApp({ credential: cert(credentials) });
      this.logger.log('Firebase Admin initialisé (FCM actif)');
    } catch (err) {
      this.logger.error(
        `Firebase Admin init failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  isEnabled(): boolean {
    return this.app !== null;
  }

  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    if (!this.app) return false;

    await getMessaging(this.app).send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    return true;
  }

  isInvalidTokenError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const code = (err as { code?: string }).code;
    return (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    );
  }
}
