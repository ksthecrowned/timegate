import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdminService, FcmPayload } from './firebase-admin.service';

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  isExpoToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[');
  }

  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Expo push failed (${response.status}): ${text}`);
      return false;
    }

    const json = (await response.json()) as { data?: { status?: string; message?: string }[] };
    const ticket = json.data?.[0];
    if (ticket?.status === 'error') {
      this.logger.warn(`Expo push ticket error: ${ticket.message ?? 'unknown'}`);
      return false;
    }
    return true;
  }
}
