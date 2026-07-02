'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { listOrganizations } from '@/lib/api/organizations'
import type { Organization } from '@/lib/api/types'
import { HttpError } from '@/lib/http'
import { useCallback, useEffect, useState } from 'react'

const columns: Column<Organization>[] = [
  { key: 'name', label: 'Organisation', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  {
    key: 'suspendedAt',
    label: 'Statut',
    render: (v) => (v ? 'Suspendue' : 'Active'),
  },
  {
    key: 'createdAt',
    label: 'Créée le',
    render: (v) => new Date(String(v)).toLocaleDateString('fr-FR'),
  },
]

export default function OrganizationsPage() {
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
        breadcrumbs={[{ label: 'Organisations' }]}
        action={<AddPageLink href="/organizations/new" label="Nouvelle organisation" />}
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
        actions={(row) => <ActionButtons viewHref={`/organizations/${row.id}`} />}
      />
    </div>
  )
}
