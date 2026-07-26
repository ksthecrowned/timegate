'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  primaryBtnClass,
} from '@/components/timegate/ui'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { listSubscriptions } from '@/lib/timegate/admin-saas'
import type { Subscription, SubscriptionStatus } from '@/lib/timegate/types'
import {
  formatDaysRemaining,
  planLabel,
  subscriptionSourceLabel,
  subscriptionStatusLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

function StatusBadge({ status }: { status: SubscriptionStatus['status'] }) {
  if (!status) return <span className="text-slate-400">—</span>
  const map: Record<string, string> = {
    TRIAL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    GRACE_READ_ONLY: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    SUSPENDED: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map.BLOCKED}`}
    >
      {subscriptionStatusLabel(status)}
    </span>
  )
}

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string
  used: number
  max: number
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const over = used >= max && max > 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {used} / {max}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pct} % utilisés</p>
    </div>
  )
}

const historyColumns: Column<Subscription>[] = [
  {
    key: 'plan',
    label: 'Plan',
    sortable: true,
    render: (v) => planLabel(String(v)),
  },
  {
    key: 'maxEmployees',
    label: 'Employés max.',
    sortable: true,
  },
  {
    key: 'maxKiosks',
    label: 'Kiosks max.',
    sortable: true,
  },
  {
    key: 'expiresAt',
    label: 'Expire le',
    sortable: true,
    render: (v) => formatApiDate(String(v)),
  },
  {
    key: 'createdAt',
    label: 'Créé le',
    sortable: true,
    render: (v) => formatApiDate(String(v)),
  },
]

function sameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return a.slice(0, 10) === b.slice(0, 10)
}

export default function SubscriptionsPage() {
  const { status: live, loading: statusLoading } = useSubscriptionAccess()
  const [history, setHistory] = useState<Subscription[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setError('')
    try {
      const rows = await listSubscriptions({ page: 1, limit: 100 })
      setHistory(rows.data ?? [])
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const sub = live?.subscription
  const status = live?.status
  const loading = statusLoading || historyLoading
  const needsActivation = Boolean(live && (live.readOnly || live.blocked || live.status === 'TRIAL'))
  const activateLabel =
    live?.status === 'TRIAL' && upgradeTargetPlan(sub?.plan)
      ? `Passer au ${upgradeTargetPlan(sub?.plan)}`
      : 'Activer une clé'

  const cardTitle = useMemo(() => {
    if (!sub) return 'Abonnement'
    if (status === 'GRACE_READ_ONLY') return 'Période de grâce'
    if (status === 'BLOCKED') return 'Abonnement expiré'
    return planLabel(sub.plan)
  }, [status, sub])

  const detailRows = useMemo(() => {
    if (!sub) return [] as Array<{ label: string; value: ReactNode }>

    const rows: Array<{ label: string; value: ReactNode }> = [
      { label: 'Offre', value: planLabel(sub.plan) },
      { label: 'Source', value: subscriptionSourceLabel(sub.source) },
    ]

    const trialEnd = sub.trialEndsAt ?? null
    const expiresAt = sub.expiresAt ?? null
    const graceEnd = sub.graceEndsAt ?? null

    if (status === 'TRIAL') {
      rows.push({
        label: 'Fin d’essai',
        value: formatApiDate(trialEnd ?? expiresAt),
      })
      rows.push({
        label: 'Jours restants',
        value: formatDaysRemaining(sub.daysUntilExpiry),
      })
    } else if (status === 'GRACE_READ_ONLY') {
      rows.push({
        label: 'Essai terminé le',
        value: formatApiDate(trialEnd ?? expiresAt),
      })
      rows.push({
        label: 'Fin de grâce',
        value: graceEnd ? formatApiDate(graceEnd) : '—',
      })
      rows.push({
        label: 'Jours de grâce restants',
        value: formatDaysRemaining(sub.daysUntilGraceEnd),
      })
    } else if (status === 'ACTIVE') {
      rows.push({
        label: 'Expire le',
        value: expiresAt ? formatApiDate(expiresAt) : '—',
      })
      rows.push({
        label: 'Jours restants',
        value: formatDaysRemaining(sub.daysUntilExpiry),
      })
    } else if (status === 'BLOCKED' || status === 'SUSPENDED') {
      rows.push({
        label: 'Expiré le',
        value: formatApiDate(expiresAt),
      })
      if (graceEnd) {
        rows.push({
          label: 'Grâce terminée le',
          value: formatApiDate(graceEnd),
        })
      }
    } else {
      if (expiresAt) {
        rows.push({ label: 'Expire le', value: formatApiDate(expiresAt) })
      }
      if (trialEnd && !sameDay(trialEnd, expiresAt)) {
        rows.push({ label: 'Fin d’essai', value: formatApiDate(trialEnd) })
      }
      if (graceEnd) {
        rows.push({ label: 'Fin de grâce', value: formatApiDate(graceEnd) })
      }
    }

    return rows
  }, [status, sub])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Administration' }, { label: 'Mon abonnement' }]}
        action={
          <Link href="/activate" className={primaryBtnClass}>
            {needsActivation ? activateLabel : 'Activer une clé'}
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      {loading ? (
        <SkeletonDetailCard rows={6} />
      ) : (
        <div className="space-y-6">
          {sub ? (
            <>
              <DetailCard
                title={cardTitle}
                actions={status ? <StatusBadge status={status} /> : undefined}
              >
                {detailRows.map((row) => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </DetailCard>

              <div className="tg-card shadow-2xs p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                  Utilisation
                </h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <UsageMeter
                    label="Employés"
                    used={sub.usage?.employees ?? 0}
                    max={sub.usage?.maxEmployees ?? sub.maxEmployees}
                  />
                  <UsageMeter
                    label="Kiosks"
                    used={sub.usage?.kiosks ?? 0}
                    max={sub.usage?.maxKiosks ?? sub.maxKiosks}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="tg-card space-y-3 p-6 text-center shadow-2xs">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Aucun abonnement actif pour cette organisation.
              </p>
              <div className="flex justify-center">
                <Link href="/activate" className={primaryBtnClass}>
                  Activer une clé
                </Link>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Historique des périodes
            </h3>
            <DataTable
              data={history}
              columns={historyColumns}
              entityLabel="périodes"
              tableId="hs-subscriptions-history"
              emptyMessage="Aucun enregistrement d’abonnement."
              searchPlaceholder="Rechercher une période…"
            />
          </div>
        </div>
      )}
    </div>
  )
}
