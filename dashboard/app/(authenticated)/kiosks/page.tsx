'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteKiosk, listKiosks, updateKiosk } from '@/lib/timegate/kiosks'
import type { Kiosk } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Kiosk>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'branch',
    label: 'Branche',
    render: (_, row) => row.branch?.name ?? '—',
  },
  {
    key: 'status',
    label: 'Statut',
    render: (v) => <StatusBadge status={String(v).toLowerCase()} />,
  },
  {
    key: 'isActive',
    label: 'Actif',
    render: (v) => (v ? 'Oui' : 'Non'),
  },
  {
    key: 'lastSeenAt',
    label: 'Dernière activité',
    render: (v) => (v ? new Date(String(v)).toLocaleString('fr-FR') : '—'),
  },
]

export default function KiosksPage() {
  const [data, setData] = useState<Kiosk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listKiosks({ page: 1, limit: 100 })
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
    <div data-tour="kiosks-list">
      <PageHeader
        breadcrumbs={[{ label: 'Kiosques' }]}
        action={
          <AddPageLink href="/kiosks/new" label="Ajouter un kiosque" tourAction="kiosks-new" />
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
          entityLabel="kiosques"
          tableId="hs-kiosks-table"
          emptyMessage="Aucun kiosque trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/kiosks/${row.id}`}
              editHref={`/kiosks/${row.id}/edit`}
              isActive={row.isActive}
              onToggleStatus={() => {
                void updateKiosk(row.id, { isActive: !row.isActive }).then(load)
              }}
              onDelete={() => {
                void deleteKiosk(row.id).then(load)
              }}
              deleteMessage="Ce kiosque sera définitivement supprimé."
            />
          )}
        />
    </div>
  )
}
