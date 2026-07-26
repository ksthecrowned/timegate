'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteBranch, listBranches } from '@/lib/timegate/branches'
import type { Branch } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Branch>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'address', label: 'Adresse' },
  { key: 'timezone', label: 'Fuseau' },
  {
    key: 'createdAt',
    label: 'Créée le',
    render: (v) => (v ? new Date(String(v)).toLocaleDateString('fr-FR') : '—'),
  },
]

export default function BranchesPage() {
  const [data, setData] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listBranches({ page: 1, limit: 100 })
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
    <div data-tour="branches-list">
      <PageHeader
        breadcrumbs={[{ label: 'Branches' }]}
        action={
          <AddPageLink
            href="/branches/new"
            label="Ajouter une branche"
            tourAction="branches-new"
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
          entityLabel="branches"
          tableId="hs-branches-table"
          emptyMessage="Aucune branche trouvée."
          actions={(row) => (
            <ActionButtons
              viewHref={`/branches/${row.id}`}
              editHref={`/branches/${row.id}/edit`}
              onDelete={() => {
                void deleteBranch(row.id).then(load)
              }}
              deleteMessage="Cette branche sera définitivement supprimée."
            />
          )}
        />
    </div>
  )
}
