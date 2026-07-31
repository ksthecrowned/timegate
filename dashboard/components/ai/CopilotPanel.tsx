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

function CopilotMark({ className = 'size-8' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-[10px] font-bold tracking-wide text-white shadow-sm ${className}`}
      aria-hidden
    >
      TMG
    </span>
  )
}

function UsageBar({ percent, unlimited }: { percent: number | null; unlimited: boolean }) {
  if (unlimited) {
    return (
      <p className="text-[11px] text-slate-400 dark:text-slate-500">Quota IA · illimité</p>
    )
  }
  const value = percent ?? 0
  const tone = value >= 100 ? 'bg-red-500' : value >= 80 ? 'bg-amber-500' : 'bg-primary'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>Quota mensuel</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-start gap-2.5">
      <CopilotMark className="size-7 text-[9px]" />
      <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-3 dark:bg-surface-elevated-dark">
        <span className="inline-flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-white whitespace-pre-wrap shadow-sm">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <CopilotMark className="mt-0.5 size-7 shrink-0 text-[9px]" />
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap dark:bg-surface-elevated-dark dark:text-slate-100">
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {message.sources.map((source) => (
              <Link
                key={source.href}
                href={source.href}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-border-dark dark:bg-surface-card-dark"
              >
                {source.label}
                <svg className="size-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WelcomeBlock({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-5 px-2 py-6 text-center">
      <CopilotMark className="size-12 text-xs" />
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">TMG Copilot</h3>
        <p className="mx-auto max-w-[17rem] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Demandez-moi comment se porte l’entreprise, votre équipe, ou ce qui mérite votre attention.
        </p>
      </div>
      <div className="w-full text-left">
        <CopilotSuggestions onSelect={onSelect} />
      </div>
    </div>
  )
}

export default function CopilotPanel() {
  const { open, setOpen, usage, refreshUsage, canUseCopilot } = useCopilot()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const quotaBlocked = usage != null && !usage.unlimited && (usage.percent ?? 0) >= 100
  const showWelcome = messages.length === 0 && !loading

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || quotaBlocked || !canUseCopilot) return
      setError('')
      setInput('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
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
          err instanceof HttpError ? err.message : 'Erreur lors de la requête. Réessayez.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [loading, quotaBlocked, canUseCopilot, sessionId, refreshUsage],
  )

  function resizeInput() {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le copilote"
        className="fixed inset-0 z-69 bg-slate-900/40 backdrop-blur-[1px] transition-opacity lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
        onClick={() => setOpen(false)}
      />
      <aside
        className="fixed inset-y-0 right-0 z-70 flex w-full max-w-md flex-col border-l border-slate-200/80 bg-surface-card shadow-2xl dark:border-border-dark dark:bg-surface-card-dark"
        role="dialog"
        aria-label="TMG Copilot"
      >
        <header className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3.5 dark:border-border-dark">
          <CopilotMark />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">TMG Copilot</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Assistant RH · TimeGate</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-elevated-dark dark:hover:text-slate-200"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50/40 px-4 py-4 dark:bg-black/10"
        >
          {showWelcome ? (
            <WelcomeBlock onSelect={(text) => void send(text)} />
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={`${message.role}-${index}-${message.content.slice(0, 12)}`} message={message} />
              ))}
              {loading ? <TypingDots /> : null}
            </>
          )}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="space-y-2.5 border-t border-slate-200/80 bg-surface-card px-4 py-3 dark:border-border-dark dark:bg-surface-card-dark">
          {usage ? <UsageBar percent={usage.percent} unlimited={usage.unlimited} /> : null}
          {!canUseCopilot ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Le copilote n’est pas activé pour votre plan.
            </p>
          ) : null}
          {quotaBlocked ? (
            <p className="text-xs text-red-600 dark:text-red-400">Quota IA mensuel atteint.</p>
          ) : null}

          <form
            className="flex items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xs dark:border-border-dark dark:bg-surface-dark"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                resizeInput()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              placeholder="Écrire un message…"
              disabled={loading || quotaBlocked || !canUseCopilot}
              className="max-h-[7.5rem] min-h-[2.5rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={loading || quotaBlocked || !canUseCopilot || !input.trim()}
              aria-label="Envoyer"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
            Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
          </p>
        </footer>
      </aside>
    </>
  )
}
