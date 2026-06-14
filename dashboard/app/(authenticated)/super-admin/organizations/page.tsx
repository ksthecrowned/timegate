'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { listOrganizations, type Organization } from '@/lib/timegate/super-admin'
import { HttpError } from '@/lib/http'

const columns: Column<Organization>[] = [
  { key: 'name', label: 'Organisation', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  {
    key: 'createdAt',
    label: 'Créée le',
    render: (v) => new Date(String(v)).toLocaleDateString('fr-FR'),
  },
]

export default function SuperAdminOrganizationsPage() {
  const [data, setData] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await listOrganizations())
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
        breadcrumbs={[{ label: 'Super admin' }, { label: 'Organisations' }]}
        action={
          <AddPageLink
            href="/super-admin/organizations/new"
            label="Nouvelle organisation"
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
          entityLabel="organisations"
          tableId="hs-organizations-table"
          emptyMessage="Aucune organisation."
          actions={(row) => (
            <ActionButtons viewHref={`/super-admin/organizations/${row.id}`} />
          )}
        />
    </div>
  )
}
