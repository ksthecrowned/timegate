'use client'

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/timegate/notifications'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function formatWhen(iso: string) {
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH} h`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, open, close)

  const refreshCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount()
      setUnreadCount(res.count)
    } catch {
      // API indisponible ou non authentifié
    }
  }, [])

  const loadInbox = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listNotifications({ page: 1, limit: 15 })
      setItems(res.data)
      setUnreadCount(res.meta.unreadCount)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCount()
    const interval = setInterval(() => void refreshCount(), 60_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  useEffect(() => {
    if (open) void loadInbox()
  }, [open, loadInbox])

  async function handleMarkRead(item: NotificationItem) {
    if (item.readAt) return
    try {
      await markNotificationRead(item.id)
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-full p-2.5 text-black hover:bg-black/10 dark:text-white dark:hover:bg-white/10"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-5" strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className="absolute end-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute end-0 top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden tg-card"
          role="dialog"
          aria-label="Boîte de notifications"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-primary hover:underline dark:text-accent"
              >
                Tout marquer lu
              </button>
            ) : null}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-border-dark">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Chargement…
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Aucune notification
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void handleMarkRead(item)}
                    className={`w-full px-4 py-3 text-start hover:bg-primary/10 dark:hover:bg-primary/15 ${
                      !item.readAt ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                      {item.body}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {formatWhen(item.createdAt)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
