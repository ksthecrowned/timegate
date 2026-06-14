/** Index employé → dates férié (clé ISO date UTC `YYYY-MM-DD`). */
export type EmployeeHolidayIndex = Map<string, Set<string>>;

export function isEmployeeHoliday(
  index: EmployeeHolidayIndex,
  employeeId: string,
  day: Date,
): boolean {
  const key = day.toISOString().slice(0, 10);
  return index.get(employeeId)?.has(key) ?? false;
}

export function holidayDateKey(day: Date): string {
  const d = new Date(day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
