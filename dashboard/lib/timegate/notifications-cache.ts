import type { NotificationItem } from './notifications'

export type NotificationsCache = {
  items: NotificationItem[]
  unreadCount: number
  cachedAt: number
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null
    const ls = (globalThis as { localStorage?: Storage }).localStorage
    return ls ?? null
  } catch {
    return null
  }
}

export function notificationsCacheKey(userId: string): string {
  return `timegate.dashboard.notifications.v1:${userId}`
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === 'string' &&
    typeof row.type === 'string' &&
    typeof row.title === 'string' &&
    typeof row.body === 'string' &&
    typeof row.createdAt === 'string' &&
    (row.readAt === null || typeof row.readAt === 'string')
  )
}

function parseCache(raw: string): NotificationsCache | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const row = parsed as Record<string, unknown>
    if (!Array.isArray(row.items) || !row.items.every(isNotificationItem)) return null
    if (typeof row.unreadCount !== 'number' || !Number.isFinite(row.unreadCount)) return null
    if (typeof row.cachedAt !== 'number' || !Number.isFinite(row.cachedAt)) return null
    return {
      items: row.items,
      unreadCount: Math.max(0, Math.floor(row.unreadCount)),
      cachedAt: row.cachedAt,
    }
  } catch {
    return null
  }
}

export function loadNotificationsCache(userId: string): NotificationsCache | null {
  const ls = getLocalStorage()
  if (!ls || !userId.trim()) return null
  try {
    const raw = ls.getItem(notificationsCacheKey(userId))
    if (!raw) return null
    return parseCache(raw)
  } catch {
    return null
  }
}

export function saveNotificationsCache(
  userId: string,
  cache: Pick<NotificationsCache, 'items' | 'unreadCount'>,
): void {
  const ls = getLocalStorage()
  if (!ls || !userId.trim()) return
  try {
    const payload: NotificationsCache = {
      items: cache.items.slice(0, 20),
      unreadCount: Math.max(0, Math.floor(cache.unreadCount)),
      cachedAt: Date.now(),
    }
    ls.setItem(notificationsCacheKey(userId), JSON.stringify(payload))
  } catch {
    // private mode / quota
  }
}

export function clearNotificationsCache(userId: string): void {
  const ls = getLocalStorage()
  if (!ls || !userId.trim()) return
  try {
    ls.removeItem(notificationsCacheKey(userId))
  } catch {
    // ignore
  }
}
