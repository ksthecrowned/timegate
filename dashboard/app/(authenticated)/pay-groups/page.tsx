'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deletePayGroup, listPayGroups } from '@/lib/timegate/pay-groups'
import type { PayGroup } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function PayGroupsPage() {
  const [data, setData] = useState<PayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const entries = await listPayGroups({ page: 1, limit: 100 })
      setData(entries.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns: Column<PayGroup>[] = useMemo(
    () => [
      { key: 'name', label: 'Nom', sortable: true },
      {
        key: 'payDayOfMonth',
        label: "Jour d'échéance",
        sortable: true,
        render: (_, row) => `Le ${row.payDayOfMonth} du mois`,
      },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Groupes de paie' }]}
        action={<AddPageLink href="/pay-groups/new" label="Nouveau groupe" />}
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Groupes de paie utilisés pour définir le jour d’échéance de versement des salaires des
        employés.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="groupes"
        tableId="hs-pay-groups-table"
        emptyMessage="Aucun groupe de paie trouvé."
        actions={(row) => (
          <ActionButtons
            editHref={`/pay-groups/${row.id}/edit`}
            onDelete={() => {
              void deletePayGroup(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
