'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import { HttpError } from '@/lib/http'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import {
  listAnomalies,
  parseAnomalyRef,
  type AnomalyItem,
} from '@/lib/timegate/anomalies'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { secondaryBtnClass } from '@/components/timegate/ui'

const columns: Column<AnomalyItem>[] = [
  {
    key: 'createdAt',
    label: 'Créée',
    sortable: true,
    render: (v) => formatApiDateTime(v == null ? null : String(v)),
  },
  {
    key: 'title',
    label: 'Anomalie',
    sortable: true,
  },
  {
    key: 'type',
    label: 'Type',
  },
  {
    key: 'employee',
    label: 'Employé',
    render: (_, row) =>
      row.employee ? employeeDisplayName(row.employee) : row.employeeId ?? '—',
  },
  {
    key: 'workDate',
    label: 'Jour',
    render: (v) => (v ? formatApiDate(String(v)) : '—'),
  },
  {
    key: 'kind',
    label: 'Source',
    render: (v) => {
      const labels: Record<string, string> = {
        ATTENDANCE_EVENT: 'Pointage',
        PUNCH_CLAIM: 'Réclamation',
        TIMESHEET_DAY: 'Timesheet',
      }
      return labels[String(v)] ?? String(v)
    },
  },
]

export default function AnomaliesPage() {
  const [data, setData] = useState<AnomalyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listAnomalies({ page: 1, limit: 100, status })
      setData(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div data-tour="anomalies-list">
      <PageHeader
        breadcrumbs={[{ label: 'Anomalies' }]}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className={secondaryBtnClass}
              onClick={() => setStatus('OPEN')}
              disabled={status === 'OPEN'}
            >
              Ouvertes
            </button>
            <button
              type="button"
              className={secondaryBtnClass}
              onClick={() => setStatus('RESOLVED')}
              disabled={status === 'RESOLVED'}
            >
              Résolues
            </button>
          </div>
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
        entityLabel="anomalies"
        tableId="hs-anomalies-table"
        emptyMessage={
          status === 'OPEN'
            ? 'Aucune anomalie ouverte.'
            : 'Aucune anomalie résolue récente.'
        }
        actions={(row) => {
          const { kind, id } = parseAnomalyRef(row.ref)
          return (
            <Link
              href={`/anomalies/${kind}/${id}`}
              className="text-sm text-primary hover:underline"
            >
              Traiter
            </Link>
          )
        }}
      />
    </div>
  )
}
