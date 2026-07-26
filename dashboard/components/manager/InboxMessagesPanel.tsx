'use client'

import { FormField, Input, SelectSearch, Textarea } from '@/components/ui/FormField'
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${a}${b}`.toUpperCase() || '?'
}

export default function InboxMessagesPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('c')

  const [rows, setRows] = useState<ConversationSummary[]>([])
  const [employees, setEmployees] = useState<Array<{ value: string; label: string }>>([])
  const [employeeId, setEmployeeId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const threadEndRef = useRef<HTMLDivElement | null>(null)

  const selectConversation = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', 'messages')
      if (id) params.set('c', id)
      else params.delete('c')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const loadList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listConversations({ page: 1, limit: 50 })
      setRows(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
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
    if (!selectedId) {
      setDetail(null)
      setDetailError('')
      setReply('')
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    setReply('')
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
        setDetailError(err instanceof HttpError ? err.message : 'Conversation introuvable')
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
    setError('')
    if (!employeeId || !subject.trim() || !body.trim()) {
      setError('Employé, sujet et message sont requis')
      return
    }
    setCreating(true)
    try {
      const created = await createConversation({
        employeeId,
        subject: subject.trim(),
        body: body.trim(),
      })
      setSubject('')
      setBody('')
      setEmployeeId('')
      setComposeOpen(false)
      await loadList()
      selectConversation(created.id)
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
    setDetailError('')
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
            ? {
                ...r,
                lastMessageAt: message.createdAt,
                lastMessagePreview: preview,
                unread: false,
              }
            : r,
        ),
      )
      setReply('')
    } catch (err) {
      setDetailError(err instanceof HttpError ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const unreadCount = rows.filter((r) => r.unread).length
  const showThreadOnMobile = Boolean(selectedId)

  return (
    <div className="flex min-h-[32rem] flex-col lg:flex-row lg:min-h-[36rem]">
      {/* Liste */}
      <aside
        className={`flex w-full flex-col border-slate-200/80 dark:border-border-dark lg:w-[22rem] lg:shrink-0 lg:border-e ${
          showThreadOnMobile ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-border-dark">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} conversation{rows.length === 1 ? '' : 's'}
            {unreadCount > 0 ? (
              <span className="ms-1 font-medium text-primary">· {unreadCount} non lue(s)</span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setComposeOpen((v) => !v)}
            className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
          >
            <i className="fa-solid fa-pen-to-square" aria-hidden />
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

        {error ? (
          <p className="border-b border-red-200/60 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {composeOpen ? (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="space-y-3 border-b border-slate-200/80 px-3 py-3 dark:border-border-dark"
          >
            <FormField label="Employé" required>
              <SelectSearch
                instanceId="inbox-message-employee"
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
                placeholder="Sujet"
                required
              />
            </FormField>
            <FormField label="Message" required>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Votre message…"
                required
              />
            </FormField>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {creating ? 'Envoi…' : 'Envoyer'}
              </button>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-border-dark">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3">
                  <div className="size-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                <i className="fa-regular fa-comments text-xl" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Aucune conversation
              </p>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Nouveau message
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-border-dark">
              {rows.map((row) => {
                const name = employeeDisplayName(row.employee)
                const active = row.id === selectedId
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(row.id)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                        active
                          ? 'bg-primary/10'
                          : row.unread
                            ? 'bg-primary/[0.04] hover:bg-primary/[0.07]'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                        aria-hidden
                      >
                        {initialsFromName(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`truncate text-sm ${
                              row.unread || active
                                ? 'font-semibold text-slate-900 dark:text-white'
                                : 'font-medium text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {name}
                          </span>
                          {row.unread ? (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                          <time className="ms-auto shrink-0 text-[10px] tabular-nums text-slate-400">
                            {formatWhen(row.lastMessageAt)}
                          </time>
                        </div>
                        <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                          {row.subject}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {row.lastMessagePreview ?? '—'}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Détail */}
      <section
        className={`min-w-0 flex-1 flex-col ${
          showThreadOnMobile ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="mb-1 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
              <i className="fa-regular fa-envelope-open text-2xl" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Sélectionnez une conversation
            </p>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Le fil s’affiche ici. Sur mobile, la liste disparaît le temps de lire.
            </p>
          </div>
        ) : detailLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Chargement du fil…
          </div>
        ) : detailError && !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-300">{detailError}</p>
            <button
              type="button"
              onClick={() => selectConversation(null)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Retour à la liste
            </button>
          </div>
        ) : detail ? (
          <>
            <div className="flex items-start gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
              <button
                type="button"
                onClick={() => selectConversation(null)}
                className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-white/10"
                aria-label="Retour à la liste"
              >
                <i className="fa-solid fa-arrow-left text-sm" />
              </button>
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                aria-hidden
              >
                {initialsFromName(employeeDisplayName(detail.employee))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {employeeDisplayName(detail.employee)}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {detail.subject}
                </p>
              </div>
            </div>

            {detailError ? (
              <p className="border-b border-red-200/60 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {detailError}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {detail.messages.map((msg) => {
                const mine = msg.senderUserId === detail.viewerUserId
                const name =
                  `${msg.sender.firstName ?? ''} ${msg.sender.lastName ?? ''}`.trim() ||
                  (mine ? 'Vous' : 'Employé')
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                      mine
                        ? 'ms-auto rounded-br-md bg-primary text-white'
                        : 'me-auto rounded-bl-md bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100'
                    }`}
                  >
                    <div className={`mb-1 text-[10px] ${mine ? 'text-white/75' : 'text-slate-500'}`}>
                      {name} · {formatWhen(msg.createdAt)}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </div>

            <form
              onSubmit={(e) => void handleReply(e)}
              className="border-t border-slate-200/80 px-4 py-3 dark:border-border-dark"
            >
              <div className="flex items-end gap-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  maxLength={4000}
                  placeholder="Votre réponse…"
                  className="min-h-[2.75rem] flex-1 resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
                  title="Envoyer"
                >
                  <i className={`fa-solid ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-sm`} />
                </button>
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  )
}
