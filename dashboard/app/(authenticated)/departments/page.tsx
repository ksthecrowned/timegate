'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteDepartment, listDepartments } from '@/lib/timegate/departments'
import type { Department } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Department>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'createdAt',
    label: 'Créé le',
    render: (v) => (v ? new Date(String(v)).toLocaleDateString('fr-FR') : '—'),
  },
]

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listDepartments({ page: 1, limit: 100 })
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
        breadcrumbs={[{ label: 'Départements' }]}
        action={<AddPageLink href="/departments/new" label="Ajouter" />}
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
          entityLabel="départements"
          tableId="hs-departments-table"
          emptyMessage="Aucun élément trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/departments/${row.id}`}
              editHref={`/departments/${row.id}/edit`}
              onDelete={() => { void deleteDepartment(row.id).then(load) }}
            />
          )}
        />
    </div>
  )
}

