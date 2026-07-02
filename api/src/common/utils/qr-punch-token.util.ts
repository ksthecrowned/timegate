import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const QR_PUNCH_SLOT_MS = 60_000;
export const QR_PUNCH_PREFIX = 'TGQR:v2:';

export function qrPunchSlot(at: Date): number {
  return Math.floor(at.getTime() / QR_PUNCH_SLOT_MS);
}

export function qrPunchSlotExpiresAt(slot: number): Date {
  return new Date((slot + 1) * QR_PUNCH_SLOT_MS);
}

export function generateQrPunchSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function buildQrPunchCode(employeeId: string, secret: string, slot: number): string {
  return createHmac('sha256', secret)
    .update(`${employeeId}:${slot}`)
    .digest('base64url')
    .slice(0, 12);
}

export function buildQrPunchPayload(
  employeeId: string,
  secret: string,
  at = new Date(),
): { payload: string; slot: number; expiresAt: Date } {
  const slot = qrPunchSlot(at);
  const code = buildQrPunchCode(employeeId, secret, slot);
  return {
    payload: `${QR_PUNCH_PREFIX}${employeeId}:${slot}:${code}`,
    slot,
    expiresAt: qrPunchSlotExpiresAt(slot),
  };
}

export function parseQrPunchPayload(
  raw: string,
): { employeeId: string; slot: number; code: string } | null {
  const trimmed = raw.trim();
  const match = /^TGQR:v2:([^:]+):(\d+):([A-Za-z0-9_-]+)$/i.exec(trimmed);
  if (!match) return null;
  const slot = Number(match[2]);
  if (!Number.isFinite(slot)) return null;
  return { employeeId: match[1], slot, code: match[3] };
}

export function verifyQrPunchCode(
  employeeId: string,
  secret: string,
  slot: number,
  code: string,
): boolean {
  const expected = buildQrPunchCode(employeeId, secret, slot);
  if (code.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(code), Buffer.from(expected));
}

/** Accept current slot ±1 for clock skew. */
export function verifyQrPunchPayload(
  parsed: { employeeId: string; slot: number; code: string },
  secret: string,
  referenceAt: Date,
): boolean {
  const refSlot = qrPunchSlot(referenceAt);
  const slots = [refSlot, refSlot - 1, refSlot + 1, parsed.slot];
  const unique = [...new Set(slots)];
  return unique.some((slot) => verifyQrPunchCode(parsed.employeeId, secret, slot, parsed.code));
}
