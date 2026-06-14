'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteDesignation, listDesignations } from '@/lib/timegate/designations'
import type { Designation } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Designation>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'createdAt',
    label: 'Créé le',
    render: (v) => (v ? new Date(String(v)).toLocaleDateString('fr-FR') : '—'),
  },
]

export default function DesignationsPage() {
  const [data, setData] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listDesignations({ page: 1, limit: 100 })
      setData(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Postes' }]}
        action={<AddPageLink href="/designations/new" label="Ajouter" />}
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
          entityLabel="postes"
          tableId="hs-designations-table"
          emptyMessage="Aucun élément trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/designations/${row.id}`}
              editHref={`/designations/${row.id}/edit`}
              onDelete={() => { void deleteDesignation(row.id).then(load) }}
            />
          )}
        />
    </div>
  )
}

