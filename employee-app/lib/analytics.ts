import { Platform } from 'react-native';

import { employeeApi } from '@/lib/api';

export type AnalyticsEventName =
  | 'employee.login_success'
  | 'employee.qr_punch_success'
  | 'employee.leave_request_submitted';

/**
 * Fire-and-forget product analytics. Never throws to callers.
 * No PII — event name + platform only; user/company come from JWT server-side.
 */
export function trackEvent(event: AnalyticsEventName): void {
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
      ? Platform.OS
      : undefined;
  void employeeApi.trackAnalyticsEvent({ event, platform }).catch(() => undefined);
}
