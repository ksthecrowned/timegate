'use client'

import {
  planLabel,
  subscriptionStatusShortLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

function daysLeftLabel(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days < 0) return null
  if (days === 0) return "Expire aujourd'hui"
  return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
}

function graceDaysLabel(days: number | null | undefined): string | null {
  if (days == null) return null
  if (days < 0) return 'Grâce échue'
  if (days === 0) return 'Grâce jusqu’à aujourd’hui'
  return `${days} j de grâce restant${days > 1 ? 's' : ''}`
}

export default function SidebarPlanWidget() {
  const { data: session } = useSession()
  const { status, loading } = useSubscriptionAccess()

  const isAdmin = session?.user?.role === 'ADMIN'

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 px-3 py-3 dark:border-border-dark">
        <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  if (!status?.subscription) return null

  const sub = status.subscription
  const plan = sub.plan
  const label =
    status.status === 'GRACE_READ_ONLY'
      ? 'Période de grâce'
      : status.status === 'BLOCKED'
        ? 'Abonnement expiré'
        : planLabel(plan)
  const upgradeTarget = upgradeTargetPlan(plan)
  const isTrial = status.status === 'TRIAL'
  const isActive = status.status === 'ACTIVE'
  const isGrace = status.status === 'GRACE_READ_ONLY'
  const needsActivation = status.readOnly || status.blocked || isTrial
  const statusShort = subscriptionStatusShortLabel(status.status)
  const showStatusBadge = !(isTrial && plan?.toUpperCase() === 'TRIAL')

  const tone = status.blocked
    ? 'border-red-200/80 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/25'
    : status.readOnly
      ? 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20'
      : isTrial
        ? 'border-sky-200/80 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/25'
        : 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'

  const badgeTone = status.blocked
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : status.readOnly
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
      : isTrial
        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'

  const activateLabel =
    isTrial && upgradeTarget ? `Passer au ${upgradeTarget}` : 'Activer une clé'

  const usageLine = sub.usage
    ? `${sub.usage.employees}/${sub.usage.maxEmployees} employés · ${sub.usage.kiosks}/${sub.usage.maxKiosks} kiosks`
    : null

  const countdown = isGrace
    ? graceDaysLabel(sub.daysUntilGraceEnd)
    : daysLeftLabel(sub.daysUntilExpiry)
  const showDays = Boolean(
    countdown && (isTrial || isGrace || isActive || status.blocked),
  )

  return (
    <div data-tour="plan-widget" className={`rounded-xl border px-3 py-3 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
            {showStatusBadge ? (
              <span
                className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeTone}`}
              >
                {statusShort}
              </span>
            ) : null}
          </div>

          {usageLine ? (
            <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">{usageLine}</p>
          ) : null}

          {showDays ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{countdown}</p>
          ) : null}
        </div>

        {isAdmin ? (
          <Link
            href="/subscriptions"
            className="shrink-0 pt-0.5 text-xs font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
            title="Voir l'abonnement"
          >
            Détails
          </Link>
        ) : null}
      </div>

      {isAdmin && needsActivation ? (
        <Link
          href="/activate"
          className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
        >
          {activateLabel}
        </Link>
      ) : null}
    </div>
  )
}
