'use client'

import { FormField, Input, SelectSearch, Textarea } from '@/components/ui/FormField'
import { useClickOutside } from '@/lib/hooks/use-click-outside'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { listEmployees } from '@/lib/timegate/employees'
import {
  createConversation,
  getConversation,
  listConversations,
  replyToConversation,
  type ConversationDetail,
  type ConversationSummary,
} from '@/lib/timegate/messages'
import { notificationTypeLabel } from '@/lib/timegate/notification-labels'
import {
  loadNotificationsCache,
  saveNotificationsCache,
} from '@/lib/timegate/notifications-cache'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/timegate/notifications'
import { Bell, MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'

type PanelTab = 'notifications' | 'messages'

function formatWhen(iso: string) {
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH} h`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatMessageWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function metaConversationId(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const raw = (meta as Record<string, unknown>).conversationId
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export default function NotificationBell() {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? session?.user?.email ?? null
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<PanelTab>('notifications')
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null)
  const hydratedUserRef = useRef<string | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setSelectedNotif(null)
  }, [])
  useClickOutside(rootRef, open, close)

  const persistCache = useCallback(
    (nextItems: NotificationItem[], nextUnread: number) => {
      if (!userId) return
      saveNotificationsCache(userId, { items: nextItems, unreadCount: nextUnread })
    },
    [userId],
  )

  useEffect(() => {
    if (!userId || hydratedUserRef.current === userId) return
    hydratedUserRef.current = userId
    const cached = loadNotificationsCache(userId)
    if (!cached) return
    setItems(cached.items)
    setUnreadCount(cached.unreadCount)
  }, [userId])

  const refreshCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount()
      setUnreadCount(res.count)
      if (userId) {
        const cached = loadNotificationsCache(userId)
        saveNotificationsCache(userId, {
          items: cached?.items ?? [],
          unreadCount: res.count,
        })
      }
    } catch {
      // ignore — keep cached badge if any
    }
  }, [userId])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listNotifications({ page: 1, limit: 20 })
      setItems(res.data)
      setUnreadCount(res.meta.unreadCount)
      persistCache(res.data, res.meta.unreadCount)
    } catch {
      // Keep cached items visible while offline / API still failing.
    } finally {
      setLoading(false)
    }
  }, [persistCache])

  useEffect(() => {
    void refreshCount()
    const interval = setInterval(() => void refreshCount(), 60_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  useEffect(() => {
    if (open && tab === 'notifications') void loadNotifications()
  }, [open, tab, loadNotifications])

  async function openNotification(item: NotificationItem) {
    setSelectedNotif(item)
    if (item.readAt) return
    try {
      await markNotificationRead(item.id)
      const readAt = new Date().toISOString()
      const nextItems = items.map((n) => (n.id === item.id ? { ...n, readAt } : n))
      const nextUnread = Math.max(0, unreadCount - 1)
      setItems(nextItems)
      setUnreadCount(nextUnread)
      setSelectedNotif((prev) => (prev?.id === item.id ? { ...prev, readAt } : prev))
      persistCache(nextItems, nextUnread)
    } catch {
      // ignore
    }
  }

  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null)

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      const readAt = new Date().toISOString()
      const nextItems = items.map((n) => ({ ...n, readAt: n.readAt ?? readAt }))
      setItems(nextItems)
      setUnreadCount(0)
      persistCache(nextItems, 0)
      if (selectedNotif && !selectedNotif.readAt) {
        setSelectedNotif({ ...selectedNotif, readAt })
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={rootRef} data-tour="notifications">
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
          className="absolute end-0 top-full z-40 mt-2 flex h-[min(36rem,calc(100vh-5rem))] w-[min(100vw-1rem,42rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-xl dark:border-border-dark dark:bg-surface-card-dark"
          role="dialog"
          aria-label="Boîte de notifications"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1 border-b border-slate-200/80 px-2 dark:border-border-dark">
              {(
                [
                  { key: 'notifications', label: 'Alertes', icon: Bell },
                  { key: 'messages', label: 'Messagerie', icon: MessageCircle },
                ] as const
              ).map((t) => {
                const active = tab === t.key
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTab(t.key)
                      if (t.key === 'notifications') setPendingConversationId(null)
                      else setSelectedNotif(null)
                    }}
                    className={`relative inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon className="size-3.5 opacity-80" strokeWidth={2} />
                    {t.label}
                    {t.key === 'notifications' && unreadCount > 0 ? (
                      <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-red-600 dark:text-red-300">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                )
              })}

              {tab === 'notifications' && unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="ms-auto me-2 text-xs font-medium text-primary hover:underline dark:text-accent"
                >
                  Tout marquer lu
                </button>
              ) : (
                <span className="ms-auto" />
              )}
            </div>

            {tab === 'notifications' ? (
              <div className="flex min-h-0 flex-1">
                <ul
                  className={`w-full shrink-0 divide-y divide-slate-100 overflow-y-auto dark:divide-border-dark sm:max-w-[18rem] sm:border-e sm:border-slate-200/80 dark:sm:border-border-dark ${
                    selectedNotif ? 'hidden sm:block' : 'block'
                  }`}
                >
                  {loading && items.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-slate-500">Chargement…</li>
                  ) : items.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-slate-500">
                      Aucune notification
                    </li>
                  ) : (
                    items.map((item) => {
                      const active = selectedNotif?.id === item.id
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => void openNotification(item)}
                            className={`w-full px-3 py-3 text-start transition-colors ${
                              active
                                ? 'bg-primary/10'
                                : !item.readAt
                                  ? 'bg-primary/5 hover:bg-primary/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-white/4'
                            }`}
                          >
                            <p
                              className={`text-sm ${
                                !item.readAt
                                  ? 'font-semibold text-slate-900 dark:text-white'
                                  : 'font-medium text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                              {item.body}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatWhen(item.createdAt)}
                            </p>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>

                <div
                  className={`min-w-0 flex-1 flex-col ${
                    selectedNotif ? 'flex' : 'hidden sm:flex'
                  }`}
                >
                  {selectedNotif ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                      <button
                        type="button"
                        onClick={() => setSelectedNotif(null)}
                        className="mb-2 inline-flex items-center gap-1 self-start text-xs font-medium text-slate-500 hover:text-slate-800 sm:hidden"
                      >
                        <i className="fa-solid fa-arrow-left" /> Retour
                      </button>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {notificationTypeLabel(selectedNotif.type)}
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        {selectedNotif.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatWhen(selectedNotif.createdAt)}
                        {selectedNotif.readAt ? '' : ' · Non lue'}
                      </p>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {selectedNotif.body}
                      </p>
                      {metaConversationId(selectedNotif.meta) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPendingConversationId(metaConversationId(selectedNotif.meta))
                            setTab('messages')
                          }}
                          className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <MessageCircle className="size-3.5" />
                          Voir la conversation
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                      <Bell className="size-8 text-slate-300" strokeWidth={1.5} />
                      <p className="text-sm text-slate-500">
                        Sélectionnez une notification pour en voir le détail
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <TopbarMessagesPane
                initialConversationId={pendingConversationId}
                onConsumedInitial={() => setPendingConversationId(null)}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TopbarMessagesPane({
  initialConversationId,
  onConsumedInitial,
}: {
  initialConversationId: string | null
  onConsumedInitial: () => void
}) {
  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const [rows, setRows] = useState<ConversationSummary[]>([])
  const [employees, setEmployees] = useState<Array<{ value: string; label: string }>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listConversations({ page: 1, limit: 40 })
      setRows(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
    void listEmployees({ page: 1, limit: 100 }).then((res) =>
      setEmployees(
        res.data.map((e) => ({
          value: e.id,
          label: employeeDisplayName(e),
        })),
      ),
    )
  }, [loadList])

  useEffect(() => {
    if (!initialConversationId) return
    setSelectedId(initialConversationId)
    onConsumedInitial()
  }, [initialConversationId, onConsumedInitial])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    void getConversation(selectedId)
      .then((data) => {
        if (cancelled) return
        setDetail(data)
        setRows((prev) =>
          prev.map((r) => (r.id === data.id ? { ...r, unread: false } : r)),
        )
      })
      .catch((err) => {
        if (cancelled) return
        setDetail(null)
        setError(err instanceof HttpError ? err.message : 'Conversation introuvable')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [detail?.messages.length])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeId || !subject.trim() || !body.trim()) return
    setCreating(true)
    setError('')
    try {
      const created = await createConversation({
        employeeId,
        subject: subject.trim(),
        body: body.trim(),
      })
      setComposeOpen(false)
      setEmployeeId('')
      setSubject('')
      setBody('')
      await loadList()
      setSelectedId(created.id)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Envoi impossible')
    } finally {
      setCreating(false)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !detail || !reply.trim()) return
    setSending(true)
    try {
      const message = await replyToConversation(selectedId, reply.trim())
      const preview = reply.trim().slice(0, 240)
      setDetail({
        ...detail,
        messages: [...detail.messages, message],
        lastMessageAt: message.createdAt,
        lastMessagePreview: preview,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedId
            ? { ...r, lastMessageAt: message.createdAt, lastMessagePreview: preview, unread: false }
            : r,
        ),
      )
      setReply('')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-full max-w-[16rem] shrink-0 flex-col border-e border-slate-200/80 dark:border-border-dark sm:w-[16rem]">
        <div className="flex items-center gap-2 border-b border-slate-200/80 px-2 py-2 dark:border-border-dark">
          <button
            type="button"
            onClick={() => setComposeOpen((v) => !v)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white"
          >
            Nouveau
          </button>
          <button
            type="button"
            onClick={() => void loadList()}
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            title="Actualiser"
          >
            <i className={`fa-solid fa-rotate-right text-xs ${loading ? 'fa-spin' : ''}`} />
          </button>
        </div>

        {composeOpen ? (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="space-y-2 border-b border-slate-200/80 px-2 py-2 dark:border-border-dark"
          >
            <FormField label="Employé" required>
              <SelectSearch
                instanceId="topbar-message-employee"
                options={employees}
                value={findOption(employees, employeeId)}
                onChange={(opt) => setEmployeeId(opt?.value ?? '')}
                required
              />
            </FormField>
            <FormField label="Sujet" required>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
            </FormField>
            <FormField label="Message" required>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                maxLength={4000}
                required
              />
            </FormField>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-primary px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {creating ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="border-b border-red-200/60 bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-border-dark">
          {loading ? (
            <li className="px-3 py-4 text-center text-xs text-slate-500">Chargement…</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-slate-500">Aucune conversation</li>
          ) : (
            rows.map((row) => {
              const name = employeeDisplayName(row.employee)
              const active = row.id === selectedId
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full px-3 py-2.5 text-start ${
                      active
                        ? 'bg-primary/10'
                        : row.unread
                          ? 'bg-primary/4 hover:bg-primary/8'
                          : 'hover:bg-slate-50 dark:hover:bg-white/4'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-xs ${
                          row.unread || active ? 'font-semibold' : 'font-medium'
                        } text-slate-900 dark:text-white`}
                      >
                        {name}
                      </span>
                      {row.unread ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="truncate text-[11px] text-slate-500">{row.subject}</p>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <MessageCircle className="size-8 text-slate-300" strokeWidth={1.5} />
            <p className="text-sm text-slate-500">Sélectionnez une conversation</p>
          </div>
        ) : detailLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Chargement…
          </div>
        ) : detail ? (
          <>
            <div className="border-b border-slate-200/80 px-3 py-2.5 dark:border-border-dark">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {employeeDisplayName(detail.employee)}
              </p>
              <p className="truncate text-xs text-slate-500">{detail.subject}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {detail.messages.map((msg) => {
                const mine = msg.senderUserId === detail.viewerUserId
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? 'ms-auto rounded-br-md bg-primary text-white'
                        : 'me-auto rounded-bl-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                    }`}
                  >
                    <p className={`mb-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                      {formatMessageWhen(msg.createdAt)}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </div>
            <form
              onSubmit={(e) => void handleReply(e)}
              className="flex items-end gap-2 border-t border-slate-200/80 px-3 py-2 dark:border-border-dark"
            >
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Répondre…"
                className="min-h-10 flex-1 resize-none py-2! text-sm"
                required
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
              >
                <i className={`fa-solid ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Conversation introuvable
          </div>
        )}
      </section>
    </div>
  )
}
