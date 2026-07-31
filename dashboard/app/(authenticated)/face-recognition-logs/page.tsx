'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { listFaceRecognitionLogs } from '@/lib/timegate/face-recognition-logs'
import type { FaceRecognitionLog } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { formatApiDateTime } from '@/lib/date-utils'
import { ApiErrorBanner } from '@/components/timegate/ui'

const columns: Column<FaceRecognitionLog>[] = [
  {
    key: 'capturedAt',
    label: 'Capturé le',
    sortable: true,
    render: (v) => formatApiDateTime(v == null ? null : String(v)),
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
      <PageHeader
        breadcrumbs={[{ label: 'Présence' }, { label: 'Logs biométriques' }]}
      />
      <ApiErrorBanner message={error} />
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
