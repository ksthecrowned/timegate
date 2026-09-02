import * as SecureStore from 'expo-secure-store';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';
import Utf8 from 'crypto-js/enc-utf8';
import { API_BASE, clearProvisioning, getLifetimeToken } from './timegate';

const QR_SECRET_KEY = 'timegate_kiosk_qr_challenge_secret';
const KIOSK_ID_KEY = 'timegate_mobile_device_id';
export const KIOSK_QR_PREFIX = 'TGQR:v3:';
export const KIOSK_QR_SLOT_MS = 45_000;

export type QrChallenge = {
  id: string | null;
  payload: string;
  expiresAt: Date;
  nonce: string;
  offline: boolean;
};

export type QrChallengePollResult = {
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED';
  result: {
    message?: string;
    eventType?: string;
    employee?: { id: string; firstName: string; lastName: string };
  } | null;
};

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomNonce(): string {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return toBase64Url(globalThis.btoa(bin));
}

export function kioskQrSlot(at: Date): number {
  return Math.floor(at.getTime() / KIOSK_QR_SLOT_MS);
}

export function buildKioskQrMac(
  kioskId: string,
  slot: number,
  nonce: string,
  secret: string,
): string {
  const digest = HmacSHA256(`${kioskId}:${slot}:${nonce}`, Utf8.parse(secret));
  return toBase64Url(Base64.stringify(digest)).slice(0, 16);
}

export async function storeQrChallengeSecret(secret: string | null | undefined) {
  if (!secret) return;
  await SecureStore.setItemAsync(QR_SECRET_KEY, secret);
}

export async function getQrChallengeSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(QR_SECRET_KEY);
}

export async function clearQrChallengeSecret() {
  await SecureStore.deleteItemAsync(QR_SECRET_KEY);
}

function buildLocalChallenge(kioskId: string, secret: string, at = new Date()): QrChallenge {
  const slot = kioskQrSlot(at);
  const nonce = randomNonce();
  const mac = buildKioskQrMac(kioskId, slot, nonce, secret);
  return {
    id: null,
    payload: `${KIOSK_QR_PREFIX}${kioskId}:${slot}:${nonce}:${mac}`,
    expiresAt: new Date((slot + 1) * KIOSK_QR_SLOT_MS),
    nonce,
    offline: true,
  };
}

export async function createQrChallenge(): Promise<QrChallenge> {
  const token = await getLifetimeToken();
  const secret = await getQrChallengeSecret();
  const kioskId = await SecureStore.getItemAsync(KIOSK_ID_KEY);

  const offlineOrThrow = (): QrChallenge => {
    if (secret && kioskId) return buildLocalChallenge(kioskId, secret);
    throw new Error(
      token
        ? 'Impossible de créer un challenge QR. Vérifiez la connexion ou re-provisionnez.'
        : 'Appareil non provisionné.',
    );
  };

  if (!token) return offlineOrThrow();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/kiosk/qr-challenge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Network failure only — allow locally signed challenge.
    return offlineOrThrow();
  }

  if (res.ok) {
    const json = (await res.json()) as {
      id: string;
      payload: string;
      expiresAt: string;
      nonce: string;
    };
    return {
      id: json.id,
      payload: json.payload,
      expiresAt: new Date(json.expiresAt),
      nonce: json.nonce,
      offline: false,
    };
  }

  // Auth / policy denial: never fall back to a locally cached signing secret.
  if (res.status === 401) {
    await clearProvisioning();
    throw new Error('Session kiosk invalide. Re-provisionnez l’appareil.');
  }
  if (res.status === 403) {
    throw new Error('Pointage QR refusé pour cet appareil.');
  }
  if (res.status >= 500) {
    return offlineOrThrow();
  }

  throw new Error(`Impossible de créer un challenge QR (${res.status}).`);
}

export async function pollQrChallengeResult(
  challengeId: string,
): Promise<QrChallengePollResult> {
  const token = await getLifetimeToken();
  if (!token) {
    return { status: 'PENDING', result: null };
  }
  const res = await fetch(`${API_BASE}/auth/kiosk/qr-challenge/${challengeId}/result`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return { status: 'PENDING', result: null };
  }
  return (await res.json()) as QrChallengePollResult;
}
