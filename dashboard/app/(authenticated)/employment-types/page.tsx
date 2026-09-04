'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteEmploymentType, listEmploymentTypes } from '@/lib/timegate/employment-types'
import type { EmploymentType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { formatApiDate } from '@/lib/date-utils'

const columns: Column<EmploymentType>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'payMode',
    label: 'Paie',
    render: (v) => (v === 'FLAT' ? 'Forfait' : 'Mensuel'),
  },
  {
    key: 'includeInPayroll',
    label: 'Cycles',
    render: (v) => (v ? 'Oui' : 'Non'),
  },
  {
    key: 'accruesLeave',
    label: 'Congés',
    render: (v) => (v ? 'Oui' : 'Non'),
  },
  {
    key: 'createdAt',
    label: 'Créé le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
]

export default function EmploymentTypesPage() {
  const [data, setData] = useState<EmploymentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listEmploymentTypes({ page: 1, limit: 100 })
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
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Types de contrat' }]}
        action={<AddPageLink href="/employment-types/new" label="Ajouter" />}
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
        entityLabel="types de contrat"
        tableId="hs-employment-types-table"
        emptyMessage="Aucun type de contrat. Ajoutez CDI, CDD, stage…"
        actions={(row) => (
          <ActionButtons
            viewHref={`/employment-types/${row.id}`}
            editHref={`/employment-types/${row.id}/edit`}
            onDelete={() => {
              void deleteEmploymentType(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
