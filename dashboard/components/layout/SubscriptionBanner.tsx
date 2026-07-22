'use client'

import Link from 'next/link'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { planLabel, subscriptionStatusLabel } from '@/lib/subscription-ui'

export default function SubscriptionBanner() {
  const { status, readOnly, blocked } = useSubscriptionAccess()

  if (!status) return null

  const sub = status.subscription
  const usage = sub?.usage
  const employeePct =
    usage && usage.maxEmployees > 0
      ? Math.round((usage.employees / usage.maxEmployees) * 100)
      : null
  const kioskPct =
    usage && usage.maxKiosks > 0 ? Math.round((usage.kiosks / usage.maxKiosks) * 100) : null
  const quotaHigh =
    (employeePct != null && employeePct >= 80) || (kioskPct != null && kioskPct >= 80)

  const showBanner =
    readOnly ||
    status.status === 'TRIAL' ||
    blocked ||
    quotaHigh ||
    (sub?.daysUntilExpiry != null && sub.daysUntilExpiry <= 7)

  if (!showBanner) return null

  const tone = blocked
    ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
    : readOnly
      ? 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100'
      : status.status === 'TRIAL'
        ? 'bg-sky-50 border-sky-200 text-sky-950 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-100'
        : 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100'

  const daysLeft = sub?.daysUntilExpiry
  const detailParts: string[] = []
  if (sub?.plan) detailParts.push(planLabel(sub.plan))
  if (status.status) detailParts.push(subscriptionStatusLabel(status.status))
  if (daysLeft != null && daysLeft >= 0) {
    detailParts.push(
      daysLeft === 0
        ? 'expire aujourd\'hui'
        : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`,
    )
  }
  if (usage) {
    detailParts.push(
      `${usage.employees}/${usage.maxEmployees} employés · ${usage.kiosks}/${usage.maxKiosks} kiosks`,
    )
  }

  return (
    <div className={`border-b px-4 py-2.5 text-sm ${tone}`}>
      <div className="mx-auto flex flex-wrap items-center justify-between gap-2 max-w-[1600px]">
        <p>
          <span className="font-semibold">{detailParts.join(' · ')}</span>
          {readOnly ? (
            <span className="ml-2 opacity-90">
              Les modifications sont désactivées jusqu&apos;à activation d&apos;une clé.
            </span>
          ) : null}
          {quotaHigh && !readOnly ? (
            <span className="ml-2 opacity-90">Quota proche de la limite.</span>
          ) : null}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/subscriptions" className="font-semibold underline underline-offset-2">
            Voir l&apos;abonnement
          </Link>
          {(readOnly || blocked || status.status === 'TRIAL') && (
            <Link href="/activate" className="font-semibold underline underline-offset-2">
              Activer une clé
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
