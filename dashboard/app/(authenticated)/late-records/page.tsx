'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { deleteLateRecord, listLateRecords, syncLateRecords } from '@/lib/timegate/late-records'
import type { LateRecord } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

function last30DaysRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

const columns: Column<LateRecord>[] = [
  employeeTableColumn<LateRecord>({ sortable: true }),
  dateTableColumn<LateRecord>('date', 'Date', { sortable: true }),
  {
    key: 'latenessMinutes',
    label: 'Retard (min)',
    sortable: true,
  },
  {
    key: 'justified',
    label: 'Justifié',
    render: (_, row) => (row.justified ? 'Oui' : 'Non'),
  },
  { key: 'reason', label: 'Motif' },
  {
    key: 'justificationFileUrl',
    label: 'Justificatif',
    render: (_, row) =>
      row.justificationFileUrl ? (
        <a href={row.justificationFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Lien
        </a>
      ) : (
        '—'
      ),
  },
]

export default function LateRecordsPage() {
  const [data, setData] = useState<LateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listLateRecords({ page: 1, limit: 100 })).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSync() {
    setSyncing(true)
    setSyncMessage('')
    setError('')
    try {
      const range = last30DaysRange()
      const res = await syncLateRecords(range)
      setSyncMessage(
        `Synchronisation terminée : ${res.created} créé(s), ${res.updated} mise(s) à jour.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Synchronisation impossible')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Retards à justifier' }]}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleSync()}
              className={primaryBtnClass}
            >
              {syncing ? 'Synchronisation…' : 'Synchroniser (30 j)'}
            </button>
            <AddPageLink href="/late-records/new" label="Ajouter un retard" />
          </div>
        }
      />
      <ApiErrorBanner message={error} />
      {syncMessage && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {syncMessage}
        </div>
      )}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="retards"
        tableId="hs-late-records-table"
        emptyMessage="Aucun retard trouvé."
        actions={(row) => (
          <ActionButtons
            viewHref={`/late-records/${row.id}`}
            editHref={`/late-records/${row.id}/edit`}
            onDelete={() => {
              void deleteLateRecord(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
