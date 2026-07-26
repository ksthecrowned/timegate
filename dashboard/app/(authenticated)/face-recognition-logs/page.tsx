'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { listFaceRecognitionLogs } from '@/lib/timegate/face-recognition-logs'
import type { FaceRecognitionLog } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<FaceRecognitionLog>[] = [
  {
    key: 'capturedAt',
    label: 'Capturé le',
    sortable: true,
    render: (v) => (v ? new Date(String(v)).toLocaleString('fr-FR') : '—'),
  },
  employeeTableColumn<FaceRecognitionLog>(),
  {
    key: 'kiosk',
    label: 'Kiosque',
    render: (_, row) => row.kiosk?.name ?? '—',
  },
  {
    key: 'success',
    label: 'Résultat',
    render: (_, row) => (
      <StatusBadge status={row.success ? 'approved' : 'rejected'} />
    ),
  },
  {
    key: 'confidence',
    label: 'Confiance',
    render: (v) => (v != null ? `${Math.round(Number(v) * 100)} %` : '—'),
  },
  {
    key: 'offlineSync',
    label: 'Hors ligne',
    render: (_, row) => (row.offlineSync ? 'Oui' : 'Non'),
  },
]

export default function FaceRecognitionLogsPage() {
  const [data, setData] = useState<FaceRecognitionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listFaceRecognitionLogs({ page: 1, limit: 100 })).data)
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
      <PageHeader breadcrumbs={[{ label: 'Présence' }, { label: 'Logs biométriques' }]} />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Debug reconnaissance faciale (confiance, photo). La source RH des pointages reste{' '}
        <a href="/attendance/events" className="text-primary hover:underline">
          Événements de pointage
        </a>
        .
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
          entityLabel="journaux"
          tableId="hs-face-recognition-logs-table"
          emptyMessage="Aucun journal trouvé."
        />
    </div>
  )
}
