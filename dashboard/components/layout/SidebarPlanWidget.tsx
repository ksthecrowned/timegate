'use client'

import {
  planLabel,
  subscriptionStatusShortLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

function daysLeftShort(days: number | null | undefined): string | null {
  if (days == null || days < 0) return null
  if (days === 0) return 'expire aujourd’hui'
  return `${days}j restants`
}

export default function SidebarPlanWidget() {
  const { data: session } = useSession()
  const { status, loading } = useSubscriptionAccess()

  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200/80 px-2.5 py-2 dark:border-border-dark">
        <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }

  if (!status?.subscription) return null

  const sub = status.subscription
  const plan = sub.plan
  const label = planLabel(plan)
  const upgradeTarget = upgradeTargetPlan(plan)
  const daysLeft = daysLeftShort(sub.daysUntilExpiry)
  const isTrial = status.status === 'TRIAL'
  const isActive = status.status === 'ACTIVE'
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
    ? 'text-red-700 dark:text-red-300'
    : status.readOnly
      ? 'text-amber-800 dark:text-amber-200'
      : isTrial
        ? 'text-sky-700 dark:text-sky-300'
        : 'text-emerald-700 dark:text-emerald-300'

  const activateLabel =
    isTrial && upgradeTarget ? `Passer au ${upgradeTarget}` : 'Activer une clé'

  const metaParts = [
    sub.usage
      ? `${sub.usage.employees}/${sub.usage.maxEmployees} emp. · ${sub.usage.kiosks}/${sub.usage.maxKiosks} kiosks`
      : null,
    daysLeft && (isTrial || status.readOnly || isActive) ? daysLeft : null,
  ].filter(Boolean)

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
          {label}
          {showStatusBadge ? (
            <span className={`font-medium ${badgeTone}`}> · {statusShort}</span>
          ) : null}
        </p>
        {isAdmin ? (
          <Link
            href="/subscriptions"
            className="shrink-0 text-[11px] font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
            title="Voir l'abonnement"
          >
            Détails
          </Link>
        ) : null}
      </div>

      {metaParts.length > 0 ? (
        <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">
          {metaParts.join(' · ')}
        </p>
      ) : null}

      {isAdmin && needsActivation ? (
        <Link
          href="/activate"
          className="mt-1.5 inline-flex w-full items-center justify-center rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary/90"
        >
          {activateLabel}
        </Link>
      ) : null}
    </div>
  )
}
