/**
 * Resolves the pay due date for a payroll run month (UTC date-only).
 * Clamps `payDayOfMonth` to the last day of the target month when needed.
 */
export function resolvePayDueDate(
  year: number,
  month: number,
  payDayOfMonth: number,
): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(payDayOfMonth, lastDayOfMonth);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Resolves the effective pay day for an employee: override wins over group default.
 */
export function resolveEmployeePayDay(
  groupDay: number | null | undefined,
  override: number | null | undefined,
): number | null {
  if (override != null) return override;
  if (groupDay != null) return groupDay;
  return null;
}
