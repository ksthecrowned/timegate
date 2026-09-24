'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { HttpError } from '@/lib/http'
import { formatApiDateTime } from '@/lib/date-utils'
import {
  listClientMissions,
  type ClientMission,
} from '@/lib/timegate/client-missions'

const columns: Column<ClientMission>[] = [
  { key: 'title', label: 'Mission', sortable: true },
  {
    key: 'location',
    label: 'Lieu',
    render: (_, row) => row.location?.clientLabel ?? row.location?.name ?? '—',
  },
  { key: 'status', label: 'Statut' },
  {
    key: 'publicPath',
    label: 'Lien',
    render: (v) => (v ? String(v) : '—'),
  },
  {
    key: 'createdAt',
    label: 'Créée',
    render: (v) => formatApiDateTime(v == null ? null : String(v)),
  },
]

export default function ClientMissionsPage() {
  const [data, setData] = useState<ClientMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listClientMissions({ page: 1, limit: 100 })
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
        breadcrumbs={[{ label: 'Missions client' }]}
        action={
          <AddPageLink
            href="/client-missions/new"
            label="Nouvelle mission"
            tourAction="client-missions-new"
          />
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="missions"
        tableId="hs-client-missions-table"
        emptyMessage="Aucune mission client."
        actions={(row) => (
          <ActionButtons viewHref={`/client-missions/${row.id}`} />
        )}
      />
    </div>
  )
}
