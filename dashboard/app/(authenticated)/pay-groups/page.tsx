'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { deletePayGroup, listPayGroups } from '@/lib/timegate/pay-groups'
import type { PayGroup } from '@/lib/timegate/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
      {
        key: 'name',
        label: 'Nom',
        sortable: true,
        render: (_, row) => (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
            {row.isDefault ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Par défaut
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'payDayOfMonth',
        label: 'Jour de paie',
        sortable: true,
        render: (_, row) => `Le ${row.payDayOfMonth}`,
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
            onDelete={
              data.length <= 1
                ? undefined
                : () => {
                    void deletePayGroup(row.id)
                      .then(load)
                      .catch((err) =>
                        setError(
                          err instanceof HttpError ? err.message : 'Suppression impossible',
                        ),
                      )
                  }
            }
            deleteMessage={
              row.isDefault
                ? 'Ce groupe est le défaut. Les employés seront basculés sur un autre groupe.'
                : undefined
            }
          />
        )}
      />
    </div>
  )
}
