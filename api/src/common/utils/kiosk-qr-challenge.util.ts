import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const KIOSK_QR_PREFIX = 'TGQR:v3:';
export const KIOSK_QR_SLOT_MS = 45_000;

export function kioskQrSlot(at: Date): number {
  return Math.floor(at.getTime() / KIOSK_QR_SLOT_MS);
}

export function generateKioskQrChallengeSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function buildKioskQrMac(
  kioskId: string,
  slot: number,
  nonce: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${kioskId}:${slot}:${nonce}`)
    .digest('base64url')
    .slice(0, 16);
}

export function buildKioskQrChallengePayload(
  kioskId: string,
  secret: string,
  at = new Date(),
): { payload: string; slot: number; nonce: string; expiresAt: Date } {
  const slot = kioskQrSlot(at);
  const nonce = randomBytes(8).toString('base64url');
  const mac = buildKioskQrMac(kioskId, slot, nonce, secret);
  return {
    payload: `${KIOSK_QR_PREFIX}${kioskId}:${slot}:${nonce}:${mac}`,
    slot,
    nonce,
    expiresAt: new Date((slot + 1) * KIOSK_QR_SLOT_MS),
  };
}

export function parseKioskQrChallengePayload(raw: string): {
  kioskId: string;
  slot: number;
  nonce: string;
  mac: string;
} | null {
  const match = /^TGQR:v3:([^:]+):(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/i.exec(raw.trim());
  if (!match) return null;
  const slot = Number(match[2]);
  if (!Number.isFinite(slot)) return null;
  return { kioskId: match[1], slot, nonce: match[3], mac: match[4] };
}

export function verifyKioskQrChallengePayload(
  parsed: { kioskId: string; slot: number; nonce: string; mac: string },
  secret: string,
  referenceAt: Date,
): boolean {
  const ref = kioskQrSlot(referenceAt);
  const slots = [...new Set([ref, ref - 1, ref + 1, parsed.slot])];
  return slots.some((slot) => {
    const expected = buildKioskQrMac(parsed.kioskId, slot, parsed.nonce, secret);
    if (expected.length !== parsed.mac.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.mac));
  });
}
