'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/ui/PageHeader'
import { RecordCard, RecordCardField, RecordCardList } from '@/components/ui/RecordCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { fetchSubscriptionStatus } from '@/lib/auth/timegate-auth'
import { listSubscriptions } from '@/lib/timegate/admin-saas'
import type { Subscription, SubscriptionStatus } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { formatApiDate } from '@/lib/date-utils'

function statusBadge(status: SubscriptionStatus['status']) {
  const map: Record<string, string> = {
    TRIAL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    GRACE_READ_ONLY: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    SUSPENDED: 'bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:text-neutral-200',
  }
  const label: Record<string, string> = {
    TRIAL: 'Essai',
    ACTIVE: 'Actif',
    GRACE_READ_ONLY: 'Grâce (lecture seule)',
    BLOCKED: 'Expiré',
    SUSPENDED: 'Suspendu',
  }
  if (!status) return null
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map.BLOCKED}`}>
      {label[status] ?? status}
    </span>
  )
}

function SubscriptionCardsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 dark:border-neutral-700">
          <SkeletonBlock className="h-4 w-40 mb-3" />
          <SkeletonBlock className="h-3 w-full mb-2" />
        </div>
      ))}
    </div>
  )
}

export default function SubscriptionsPage() {
  const { data: session } = useSession()
  const [live, setLive] = useState<SubscriptionStatus | null>(null)
  const [history, setHistory] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    setError('')
    try {
      const [current, rows] = await Promise.all([
        fetchSubscriptionStatus(session.accessToken),
        listSubscriptions({ page: 1, limit: 100 }),
      ])
      setLive(current)
      setHistory(rows.data ?? [])
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    void load()
  }, [load])

  const sub = live?.subscription

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Mon abonnement' },
        ]}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <SubscriptionCardsSkeleton />
      ) : (
        <div className="space-y-6">
          {live && sub ? (
            <div className="tg-card shadow-2xs p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Abonnement actuel
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                    Plan {sub.plan}
                    {sub.source ? ` · ${sub.source}` : ''}
                  </p>
                </div>
                {statusBadge(live.status)}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-neutral-400">Expire le</p>
                  <p className="font-medium">{sub.expiresAt ? formatApiDate(sub.expiresAt) : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-neutral-400">Employés</p>
                  <p className="font-medium">
                    {sub.usage
                      ? `${sub.usage.employees} / ${sub.usage.maxEmployees}`
                      : sub.maxEmployees}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-neutral-400">Kiosks</p>
                  <p className="font-medium">
                    {sub.usage
                      ? `${sub.usage.kiosks} / ${sub.usage.maxKiosks}`
                      : sub.maxKiosks}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-neutral-400">Jours restants</p>
                  <p className="font-medium">
                    {sub.daysUntilExpiry != null ? sub.daysUntilExpiry : '—'}
                  </p>
                </div>
              </div>

              {(live.readOnly || live.blocked || live.status === 'TRIAL') && (
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
                  <Link
                    href="/activate"
                    className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    Activer une clé
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-3">
                Historique des périodes
              </h3>
              <RecordCardList
                items={history}
                emptyMessage="Aucun enregistrement d'abonnement."
                keyFn={(row) => row.id}
                renderItem={(row) => (
                  <RecordCard title={`Plan ${row.plan}`}>
                    <RecordCardField label="Employés max." value={String(row.maxEmployees)} />
                    <RecordCardField label="Kiosks max." value={String(row.maxKiosks)} />
                    <RecordCardField label="Expire le" value={formatApiDate(row.expiresAt)} />
                    <RecordCardField label="Créé le" value={formatApiDate(row.createdAt)} />
                  </RecordCard>
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
