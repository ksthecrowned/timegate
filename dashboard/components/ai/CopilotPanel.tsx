'use client'

import CopilotSuggestions from '@/components/ai/CopilotSuggestions'
import { useCopilot } from '@/components/ai/CopilotProvider'
import { HttpError } from '@/lib/http'
import {
  postCopilotChat,
  type CopilotMessage,
  type CopilotSource,
} from '@/lib/timegate/copilot'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

function UsageBar({ percent, unlimited }: { percent: number | null; unlimited: boolean }) {
  if (unlimited) {
    return <p className="text-xs text-slate-500">Quota IA : illimité</p>
  }
  const value = percent ?? 0
  const tone =
    value >= 100 ? 'bg-red-500' : value >= 80 ? 'bg-amber-500' : 'bg-primary'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Quota IA mensuel</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function MessageBubble({
  message,
}: {
  message: CopilotMessage & { sources?: CopilotSource[] }
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-slate-100 text-slate-800 dark:bg-surface-elevated-dark dark:text-slate-100'
        }`}
      >
        {message.content}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-slate-200/60 pt-2 dark:border-border-dark">
            {message.sources.map((source) => (
              <Link
                key={source.href}
                href={source.href}
                className="block text-xs font-medium text-primary hover:underline"
                onClick={() => undefined}
              >
                {source.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CopilotPanel() {
  const { open, setOpen, usage, refreshUsage, canUseCopilot } = useCopilot()
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content:
        'Bonjour ! Je peux vous aider sur l’équipe du jour, les retards, les validations en attente, les kiosks et les heures sup.',
    },
  ])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const quotaBlocked = usage != null && !usage.unlimited && (usage.percent ?? 0) >= 100

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || quotaBlocked) return
      setError('')
      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
      setLoading(true)
      try {
        const res = await postCopilotChat({ message: trimmed, sessionId })
        setSessionId(res.sessionId)
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.text, sources: res.sources },
        ])
        await refreshUsage()
      } catch (err) {
        const msg =
          err instanceof HttpError
            ? err.message
            : 'Erreur lors de la requête. Réessayez.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [loading, quotaBlocked, sessionId, refreshUsage],
  )

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le copilote"
        className="fixed inset-0 z-[69] bg-black/30 lg:bg-transparent lg:pointer-events-none"
        onClick={() => setOpen(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200/80 bg-surface-card shadow-xl dark:border-border-dark dark:bg-surface-card-dark">
        <header className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">TimeGate Copilot</p>
            <p className="text-xs text-slate-500">Assistant RH manager</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-elevated-dark"
          >
            ✕
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length <= 1 && (
            <div className="pb-2">
              <CopilotSuggestions onSelect={(text) => void send(text)} />
            </div>
          )}
          {messages.map((message, index) => (
            <MessageBubble key={`${message.role}-${index}`} message={message} />
          ))}
          {loading && (
            <p className="text-xs text-slate-500 animate-pulse">Recherche en cours…</p>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200/80 px-4 py-3 space-y-3 dark:border-border-dark">
          {usage && <UsageBar percent={usage.percent} unlimited={usage.unlimited} />}
          {!canUseCopilot && (
            <p className="text-xs text-amber-700">Le copilote IA n’est pas activé pour votre plan.</p>
          )}
          {quotaBlocked && (
            <p className="text-xs text-red-600">Quota IA mensuel atteint.</p>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question…"
              disabled={loading || quotaBlocked || !canUseCopilot}
              className="flex-1 rounded-lg border border-slate-200/80 px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-elevated-dark"
            />
            <button
              type="submit"
              disabled={loading || quotaBlocked || !canUseCopilot || !input.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              →
            </button>
          </form>
        </footer>
      </aside>
    </>
  )
}
