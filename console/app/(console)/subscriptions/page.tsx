'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import { listSubscriptions } from '@/lib/api/saas'
import type { Subscription } from '@/lib/api/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

const columns: Column<Subscription>[] = [
  {
    key: 'company',
    label: 'Organisation',
    render: (_, row) => row.company?.name ?? row.companyId,
  },
  { key: 'plan', label: 'Plan', sortable: true },
  { key: 'maxEmployees', label: 'Max emp.' },
  { key: 'maxKiosks', label: 'Max kiosks' },
  {
    key: 'expiresAt',
    label: 'Expiration',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
]

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listSubscriptions({ limit: 100 })
      setRows(res.data)
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
      <DataTable
        loading={loading}
        data={rows}
        columns={columns}
        entityLabel="abonnements"
        tableId="hs-subscriptions-table"
        emptyMessage="Aucun abonnement."
        actions={(row) =>
          row.company?.id ? (
            <Link href={`/organizations/${row.company.id}`} className="text-sm text-primary hover:underline">
              Org
            </Link>
          ) : null
        }
      />
    </div>
  )
}
