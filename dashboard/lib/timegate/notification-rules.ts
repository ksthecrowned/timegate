import { http } from '@/lib/http'
import type { NotificationRule } from '@/lib/timegate/types'

export function listNotificationRules() {
  return http.get<NotificationRule[]>('/notifications/rules')
}

export function updateNotificationRule(
  type: string,
  payload: Partial<Pick<NotificationRule, 'inAppEnabled' | 'pushEnabled' | 'emailEnabled'>>,
) {
  return http.patch<NotificationRule>(`/notifications/rules/${type}`, payload)
}
