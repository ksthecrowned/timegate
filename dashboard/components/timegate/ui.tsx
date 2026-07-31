'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { HintTooltip } from '@/components/ui/HintTooltip'
import Link from 'next/link'

export function ApiErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
      {message}
    </div>
  )
}

export function DetailCard({
  title,
  children,
  actions,
  bare = false,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  bare?: boolean
}) {
  if (bare) {
    return (
      <section className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-border-dark dark:bg-white/3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
            {title}
          </h3>
          {actions}
        </div>
        <dl className="divide-y divide-slate-200/70 dark:divide-border-dark [&_.detail-row]:px-0! [&_.detail-row]:py-2.5">
          {children}
        </dl>
      </section>
    )
  }

  return (
    <div className="tg-card mb-4 border-t-4 border-t-primary">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        {actions}
      </div>
      <dl className="divide-y divide-slate-200/80 dark:divide-border-dark">{children}</dl>
    </div>
  )
}

export function DetailRow({
  label,
  value,
  flush = false,
}: {
  label: string
  value: React.ReactNode
  flush?: boolean
}) {
  return (
    <div
      className={`detail-row grid gap-1 py-3 md:grid-cols-3 ${flush ? '' : 'px-4 md:px-5'}`}
    >
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-900 md:col-span-2 dark:text-slate-200">{value ?? '—'}</dd>
    </div>
  )
}

export function FormCard({
  title,
  hint,
  children,
  footer,
  bare = false,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Contenu sans chrome tg-card (ex. déjà dans une carte d’onglets). */
  bare?: boolean
}) {
  const { canWrite } = useSubscriptionAccess()

  const titleBlock = bare ? (
    <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
      <span className="inline-flex items-center gap-2">
        {title}
        {hint ? <HintTooltip text={hint} /> : null}
      </span>
    </h3>
  ) : (
    <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        {title}
        {hint ? <HintTooltip text={hint} /> : null}
      </h2>
    </div>
  )

  const body = (
    <div
      className={`${bare ? '' : 'p-4 md:p-5'} ${!canWrite ? 'pointer-events-none opacity-60' : ''}`}
      aria-disabled={!canWrite}
    >
      {children}
    </div>
  )

  const footerBlock = footer ? (
    <div
      className={`flex flex-wrap items-center justify-end gap-2 ${
        bare
          ? 'mt-4 border-t border-slate-200/70 pt-3 dark:border-border-dark'
          : 'border-t border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark'
      }`}
    >
      {!canWrite ? (
        <p className="me-auto text-xs text-amber-800 dark:text-amber-200">
          Lecture seule —{' '}
          <Link href="/activate" className="font-semibold underline underline-offset-2">
            activer une clé
          </Link>
        </p>
      ) : null}
      <div
        className={`flex flex-wrap items-center justify-end gap-2 ${
          !canWrite ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        {footer}
      </div>
    </div>
  ) : null

  if (bare) {
    return (
      <section className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-border-dark dark:bg-white/3">
        {titleBlock}
        {body}
        {footerBlock}
      </section>
    )
  }

  return (
    <div className="tg-card mb-4 border-t-4 border-t-primary">
      {titleBlock}
      {body}
      {footerBlock}
    </div>
  )
}

export const primaryBtnClass =
  'py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-primary text-white shadow-sm hover:bg-secondary disabled:opacity-50 transition-colors'

export const secondaryBtnClass =
  'py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-slate-200 bg-surface-card text-slate-700 hover:bg-slate-50 dark:bg-surface-dark dark:border-border-dark dark:text-slate-200 dark:hover:bg-surface-card-dark'
