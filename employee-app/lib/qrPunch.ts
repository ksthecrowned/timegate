/** Shared QR punch helpers (unit-tested). */
export const KIOSK_QR_PREFIX = 'TGQR:v3:';

export function isKioskQrPayload(data: string): boolean {
  return data.trim().startsWith(KIOSK_QR_PREFIX);
}
