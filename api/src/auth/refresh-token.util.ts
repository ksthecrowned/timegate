import { createHash, randomBytes } from 'crypto';

/** Parse durations like `15m`, `8h`, `30d` into milliseconds. */
export function parseDurationToMs(value: string | undefined, fallbackMs: number): number {
  if (!value?.trim()) return fallbackMs;
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;
  const unit = match[2].toLowerCase();
  const mult =
    unit === 'ms'
      ? 1
      : unit === 's'
        ? 1_000
        : unit === 'm'
          ? 60_000
          : unit === 'h'
            ? 3_600_000
            : 86_400_000;
  return amount * mult;
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generateRefreshTokenRaw(): string {
  return randomBytes(48).toString('base64url');
}
