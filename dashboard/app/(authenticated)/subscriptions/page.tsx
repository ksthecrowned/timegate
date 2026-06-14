'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { RecordCard, RecordCardField, RecordCardList } from '@/components/ui/RecordCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { listSubscriptions } from '@/lib/timegate/admin-saas'
import type { Subscription } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { formatApiDate } from '@/lib/date-utils'

function SubscriptionCardsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 p-4 dark:border-neutral-700"
        >
          <SkeletonBlock className="h-4 w-40 mb-3" />
          <SkeletonBlock className="h-3 w-full mb-2" />
          <SkeletonBlock className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listSubscriptions({ page: 1, limit: 100 })).data ?? [])
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Abonnements' }]} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <SubscriptionCardsSkeleton />
      ) : (
        <RecordCardList
          items={data}
          emptyMessage="Aucun abonnement trouvé."
          keyFn={(row) => row.id}
          renderItem={(row) => (
            <RecordCard
              title={row.company?.name ?? '—'}
              subtitle={`Plan ${row.plan}`}
            >
              <RecordCardField label="Employés max." value={String(row.maxEmployees)} />
              <RecordCardField label="Kiosques max." value={String(row.maxKiosks)} />
              <RecordCardField label="Expire le" value={formatApiDate(row.expiresAt)} />
              <RecordCardField label="Créé le" value={formatApiDate(row.createdAt)} />
            </RecordCard>
          )}
        />
      )}
    </div>
  )
}
