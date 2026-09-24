'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { listLocations, type TimeGateLocation } from '@/lib/timegate/locations'
import { HttpError } from '@/lib/http'
import { formatApiDate } from '@/lib/date-utils'

const TYPE_LABELS: Record<string, string> = {
  BRANCH_SITE: 'Branche',
  CLIENT_SITE: 'Client',
  TEMPORARY: 'Temporaire',
}

const columns: Column<TimeGateLocation>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'type',
    label: 'Type',
    render: (v) => TYPE_LABELS[String(v)] ?? String(v),
  },
  { key: 'address', label: 'Adresse' },
  { key: 'clientLabel', label: 'Client' },
  {
    key: 'isActive',
    label: 'Statut',
    render: (v) => (v ? 'Actif' : 'Inactif'),
  },
  {
    key: 'createdAt',
    label: 'Créé le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
]

export default function LocationsPage() {
  const [data, setData] = useState<TimeGateLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listLocations({ page: 1, limit: 100 })
      setData(res.data)
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
    <div data-tour="locations-list">
      <PageHeader
        breadcrumbs={[{ label: 'Lieux de pointage' }]}
        action={
          <AddPageLink
            href="/locations/new"
            label="Ajouter un lieu"
            tourAction="locations-new"
          />
        }
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
        entityLabel="lieux"
        tableId="hs-locations-table"
        emptyMessage="Aucun lieu de pointage."
        actions={(row) => (
          <ActionButtons
            viewHref={`/locations/${row.id}`}
            editHref={`/locations/${row.id}/edit`}
          />
        )}
      />
    </div>
  )
}
