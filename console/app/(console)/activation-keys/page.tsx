'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { listActivationKeys } from '@/lib/api/organizations'
import type { ActivationKey } from '@/lib/api/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

const columns: Column<ActivationKey>[] = [
  {
    key: 'company',
    label: 'Organisation',
    render: (_, row) =>
      row.company ? (
        <Link href={`/organizations/${row.company.id}`} className="text-primary hover:underline">
          {row.company.name}
          <span className="ml-1 text-xs text-gray-500 dark:text-neutral-400">({row.company.sku})</span>
        </Link>
      ) : (
        row.companyId
      ),
  },
  { key: 'plan', label: 'Plan', sortable: true },
  { key: 'maxEmployees', label: 'Max emp.' },
  { key: 'maxKiosks', label: 'Max kiosks' },
  {
    key: 'status',
    label: 'État',
    render: (v) => <StatusBadge status={String(v)} />,
  },
  {
    key: 'usedAt',
    label: 'Utilisée le',
    render: (v, row) =>
      row.status === 'USED' && v
        ? formatApiDateTime(String(v))
        : '—',
  },
  {
    key: 'expiresAt',
    label: 'Expire le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
  {
    key: 'createdAt',
    label: 'Créée le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
]

export default function ActivationKeysPage() {
  const [rows, setRows] = useState<ActivationKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await listActivationKeys())
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
      <PageHeader breadcrumbs={[{ label: 'Clés d’activation' }]} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
        loading={loading}
        data={rows}
        columns={columns}
        entityLabel="clés d’activation"
        tableId="hs-activation-keys-table"
        emptyMessage="Aucune clé d’activation."
      />
    </div>
  )
}
