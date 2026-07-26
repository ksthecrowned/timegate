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
import {
  SubscriptionStatusBadge,
  SubscriptionUsageMeter,
} from '@/components/subscriptions/SubscriptionWidgets'
import { listSubscriptions } from '@/lib/timegate/admin-saas'
import type { Subscription } from '@/lib/timegate/types'
import {
  formatDaysRemaining,
  planLabel,
  subscriptionSourceLabel,
  upgradeTargetPlan,
} from '@/lib/subscription-ui'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

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
                actions={status ? <SubscriptionStatusBadge status={status} /> : undefined}
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
                  <SubscriptionUsageMeter
                    label="Employés"
                    used={sub.usage?.employees ?? 0}
                    max={sub.usage?.maxEmployees ?? sub.maxEmployees}
                  />
                  <SubscriptionUsageMeter
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
