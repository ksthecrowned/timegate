/**
 * Compare a punch timestamp to today's shift window (HH:mm from getTodaySchedule).
 * Grace ±N minutes counts as on time.
 */

export type PunctualityKind = 'early' | 'on_time' | 'late';

export type PunctualityResult = {
  kind: PunctualityKind;
  /** Absolute minutes early or late (0 when on_time) */
  minutes: number;
};

const DEFAULT_GRACE_MINUTES = 5;

function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hm.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(mins) ||
    hours < 0 ||
    hours > 23 ||
    mins < 0 ||
    mins > 59
  ) {
    return null;
  }
  return hours * 60 + mins;
}

function localMinutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function classifyDelta(
  deltaMinutes: number,
  graceMinutes: number,
): PunctualityResult {
  if (Math.abs(deltaMinutes) <= graceMinutes) {
    return { kind: 'on_time', minutes: 0 };
  }
  if (deltaMinutes < 0) {
    return { kind: 'early', minutes: Math.abs(deltaMinutes) };
  }
  return { kind: 'late', minutes: deltaMinutes };
}

/**
 * Check-in vs shift start: negative delta = early, positive = late.
 */
export function computeCheckInPunctuality(
  occurredAt: Date | string,
  shiftStartHm: string | null | undefined,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): PunctualityResult | null {
  if (!shiftStartHm) return null;
  const scheduled = parseHmToMinutes(shiftStartHm);
  if (scheduled == null) return null;
  const at = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt;
  if (Number.isNaN(at.getTime())) return null;
  const delta = localMinutesOfDay(at) - scheduled;
  return classifyDelta(delta, graceMinutes);
}

/**
 * Check-out vs shift end: negative = left early, positive = stayed late.
 */
export function computeCheckOutPunctuality(
  occurredAt: Date | string,
  shiftEndHm: string | null | undefined,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): PunctualityResult | null {
  if (!shiftEndHm) return null;
  const scheduled = parseHmToMinutes(shiftEndHm);
  if (scheduled == null) return null;
  const at = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt;
  if (Number.isNaN(at.getTime())) return null;
  const delta = localMinutesOfDay(at) - scheduled;
  return classifyDelta(delta, graceMinutes);
}
