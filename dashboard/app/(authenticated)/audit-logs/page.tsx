'use client'

import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { listAuditLogs } from '@/lib/timegate/admin-saas'
import type { AuditLog } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

const columns: Column<AuditLog>[] = [
  {
    key: 'createdAt',
    label: 'Date',
    sortable: true,
    render: (v) => formatApiDateTime(v == null ? null : String(v)),
  },
  { key: 'action', label: 'Action', sortable: true },
  { key: 'entity', label: 'Entité' },
  {
    key: 'entityId',
    label: 'Cible',
    render: (v) => (v ? String(v) : '—'),
  },
  {
    key: 'user',
    label: 'Utilisateur',
    render: (_, row) => row.user?.email ?? '—',
  },
]

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listAuditLogs({ page: 1, limit: 100 })).data)
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
      <PageHeader
        breadcrumbs={[
          { label: 'Administration', href: '/' },
          { label: 'Journaux d\'audit' },
        ]}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="entrées d'audit"
        tableId="hs-audit-logs-table"
        emptyMessage="Aucun journal d'audit pour votre organisation."
      />
    </div>
  )
}
