/** Parse ISO datetime or "HH:mm" into a Date suitable for Prisma @db.Time. */
export function toTimeOnlyDate(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, h, m, 0));
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return new Date(Date.UTC(1970, 0, 1, 8, 0, 0));
  }
  return new Date(Date.UTC(1970, 0, 1, d.getUTCHours(), d.getUTCMinutes(), 0));
}

export function formatTimeOnly(value: Date | null | undefined): string {
  if (!value) return '';
  const h = String(value.getUTCHours()).padStart(2, '0');
  const m = String(value.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Legacy API: ISO string anchored on 1970-01-01 for dashboard Date parsing. */
export function formatTimeAsIso(value: Date | null | undefined): string {
  if (!value) return new Date(Date.UTC(1970, 0, 1, 8, 0, 0)).toISOString();
  return new Date(
    Date.UTC(1970, 0, 1, value.getUTCHours(), value.getUTCMinutes(), 0),
  ).toISOString();
}
