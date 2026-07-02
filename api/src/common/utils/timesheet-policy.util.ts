/** Arrondi au pas le plus proche (0 = pas d'arrondi). */
export function roundMinutesToStep(value: number, stepMinutes: number): number {
  if (stepMinutes <= 0 || value <= 0) return Math.max(0, value);
  return Math.round(value / stepMinutes) * stepMinutes;
}

export type TimesheetPolicy = {
  lateGraceMinutes: number;
  roundingMinutes: number;
  minRestMinutes: number;
  overtimeAlertThresholdMinutes: number;
};

export const DEFAULT_TIMESHEET_POLICY: TimesheetPolicy = {
  lateGraceMinutes: 10,
  roundingMinutes: 0,
  minRestMinutes: 660,
  overtimeAlertThresholdMinutes: 120,
};
