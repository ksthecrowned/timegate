'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Textarea } from '@/components/ui/FormField'
import { HttpError } from '@/lib/http'
import {
  getConversation,
  replyToConversation,
  type ConversationDetail,
} from '@/lib/timegate/messages'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await getConversation(id)
      setDetail(data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !detail || !reply.trim()) return
    setSending(true)
    setError('')
    try {
      const message = await replyToConversation(id, reply.trim())
      setDetail({
        ...detail,
        messages: [...detail.messages, message],
        lastMessageAt: message.createdAt,
        lastMessagePreview: reply.trim().slice(0, 240),
      })
      setReply('')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Messages', href: '/messages' },
          { label: detail?.subject ?? 'Conversation' },
        ]}
      />

      {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {detail ? (
        <>
          <div className="rounded-xl border p-4 dark:border-neutral-700">
            <p className="text-sm text-slate-500">
              Employé :{' '}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {employeeDisplayName(detail.employee)}
              </span>
            </p>
            <h2 className="mt-1 text-lg font-semibold">{detail.subject}</h2>
          </div>

          <div className="space-y-3 rounded-xl border p-4 dark:border-neutral-700">
            {detail.messages.map((msg) => {
              const mine = msg.senderUserId === detail.viewerUserId
              const name =
                `${msg.sender.firstName ?? ''} ${msg.sender.lastName ?? ''}`.trim() ||
                (mine ? 'Vous' : 'Employé')
              return (
                <div
                  key={msg.id}
                  className={`max-w-2xl rounded-lg px-3 py-2 ${
                    mine
                      ? 'ml-auto bg-teal-700 text-white'
                      : 'mr-auto bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-slate-100'
                  }`}
                >
                  <div className="mb-1 text-xs opacity-80">
                    {name} · {formatWhen(msg.createdAt)}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                </div>
              )
            })}
          </div>

          <form onSubmit={(e) => void handleReply(e)} className="space-y-3">
            <FormField label="Réponse">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Votre réponse…"
                required
              />
            </FormField>
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? 'Envoi…' : 'Répondre'}
            </button>
          </form>
        </>
      ) : null}
    </div>
  )
}
