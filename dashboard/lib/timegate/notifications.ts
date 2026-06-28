import { http } from '@/lib/http'

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
  meta?: unknown
}

export async function listNotifications(params?: { page?: number; unreadOnly?: boolean }) {
  return http.get<{
    data: NotificationItem[]
    meta: { page: number; limit: number; total: number; unreadCount: number }
  }>('/notifications', { params })
}

export async function getUnreadNotificationCount() {
  return http.get<{ count: number }>('/notifications/unread-count')
}

export async function markNotificationRead(id: string) {
  return http.patch<NotificationItem>(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  return http.patch<{ updated: number }>('/notifications/read-all')
}

export async function registerWebDevice(token: string) {
  return http.post<{ id: string; platform: string }>('/devices/register', {
    token,
    platform: 'WEB',
  })
}

export async function removeWebDevice(token: string) {
  return http.post<{ ok: boolean }>('/devices/remove', { token })
}
