'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { fetchSubscriptionStatus } from '@/lib/auth/timegate-auth'
import {
  planLabel,
  subscriptionStatusLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import type { SubscriptionStatus } from '@/lib/timegate/types'

function daysLeftText(days: number | null | undefined): string | null {
  if (days == null || days < 0) return null
  if (days === 0) return 'Expire aujourd\'hui'
  return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
}

export default function SidebarPlanWidget() {
  const { data: session } = useSession()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const role = session?.user?.role
  const token = session?.accessToken
  const isAdmin = role === 'ADMIN'

  useEffect(() => {
    if (!token || role === 'SUPER_ADMIN') {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchSubscriptionStatus(token)
      .then((res) => {
        if (!cancelled) setStatus(res)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, role])

  if (role === 'SUPER_ADMIN' || loading) {
    return loading && role !== 'SUPER_ADMIN' ? (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-border-dark dark:bg-surface-elevated-dark/60">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    ) : null
  }

  if (!status?.subscription) return null

  const sub = status.subscription
  const plan = sub.plan
  const label = planLabel(plan)
  const upgradeTarget = upgradeTargetPlan(plan)
  const daysLeft = daysLeftText(sub.daysUntilExpiry)
  const isTrial = status.status === 'TRIAL'
  const isActive = status.status === 'ACTIVE'
  const needsActivation = status.readOnly || status.blocked || isTrial

  const tone = status.blocked
    ? 'border-red-200/80 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/30'
    : status.readOnly
      ? 'border-amber-200/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/25'
      : isTrial
        ? 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-primary/5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-primary/10'
        : 'border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/25'

  const badgeTone = status.blocked
    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    : status.readOnly
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
      : isTrial
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'

  return (
    <div className={`rounded-xl border p-3.5 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isTrial ? 'Votre offre' : 'Plan actuel'}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
            {label}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeTone}`}>
          {subscriptionStatusLabel(status.status)}
        </span>
      </div>

      {daysLeft && (isTrial || status.readOnly || isActive) ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{daysLeft}</p>
      ) : null}

      {sub.usage ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {sub.usage.employees}/{sub.usage.maxEmployees} employés · {sub.usage.kiosks}/{sub.usage.maxKiosks} kiosks
        </p>
      ) : null}

      {isTrial && upgradeTarget ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Passez au plan {upgradeTarget} pour débloquer plus de capacité et conserver vos données.
        </p>
      ) : null}

      {isActive && upgradeTarget ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Besoin de plus ? Passez au plan {upgradeTarget}.
        </p>
      ) : null}

      {status.readOnly ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          Lecture seule — activez une clé pour reprendre les modifications.
        </p>
      ) : null}

      {status.blocked ? (
        <p className="mt-2 text-xs text-red-800 dark:text-red-200">
          Abonnement expiré — activez une clé pour continuer.
        </p>
      ) : null}

      {(isAdmin && (needsActivation || upgradeTarget)) || (isAdmin && isActive) ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {needsActivation && isAdmin ? (
            <Link
              href="/activate"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {isTrial && upgradeTarget ? `Passer au ${upgradeTarget}` : 'Activer une clé'}
            </Link>
          ) : null}
          {isAdmin ? (
            <Link
              href="/subscriptions"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-border-dark dark:bg-surface-card-dark/80 dark:text-slate-200 dark:hover:bg-surface-card-dark"
            >
              Voir l&apos;abonnement
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
