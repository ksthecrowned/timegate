/** Common IANA timezones for TimeGate (Africa-focused + UTC). */
export const IANA_TIMEZONES = [
  'UTC',
  'Africa/Kinshasa',
  'Africa/Lubumbashi',
  'Africa/Brazzaville',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Europe/Paris',
  'Europe/London',
] as const

export function timezoneOptions(): { value: string; label: string }[] {
  return IANA_TIMEZONES.map((tz) => ({ value: tz, label: tz }))
}
