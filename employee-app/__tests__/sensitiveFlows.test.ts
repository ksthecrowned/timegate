import { isValidEmail, normalizeEmail } from '../lib/authValidation';
import { isNetworkishError } from '../lib/networkError';
import { isKioskQrPayload, KIOSK_QR_PREFIX } from '../lib/qrPunch';

describe('authValidation', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Pat@Example.COM ')).toBe('pat@example.com');
  });

  it('validates email format', () => {
    expect(isValidEmail('patrick.mukendi@sotrafer.cg')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('qrPunch helpers', () => {
  it('accepts kiosk QR prefix', () => {
    expect(isKioskQrPayload(`${KIOSK_QR_PREFIX}abc`)).toBe(true);
    expect(isKioskQrPayload('  TGQR:v3:xyz  ')).toBe(true);
    expect(isKioskQrPayload('https://example.com')).toBe(false);
  });
});

describe('isNetworkishError', () => {
  it('treats TypeError and 5xx as networkish', () => {
    expect(isNetworkishError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkishError({ status: 503, message: 'boom' })).toBe(true);
    expect(isNetworkishError({ status: 403, message: 'forbidden' })).toBe(false);
    expect(isNetworkishError(new Error('ok'))).toBe(false);
  });
});
