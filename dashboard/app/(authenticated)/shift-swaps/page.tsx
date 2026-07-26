'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { ApiErrorBanner, secondaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { type Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { REVIEW_STATUS } from '@/constants'
import { HttpError } from '@/lib/http'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import {
  listShiftSwaps,
  reviewShiftSwap,
  type ShiftSwapRequest,
} from '@/lib/timegate/shift-swaps'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type StatusFilter = ShiftSwapRequest['status'] | 'ALL'

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvés' },
  { key: 'REJECTED', label: 'Refusés' },
  { key: 'CANCELLED', label: 'Annulés' },
]

function formatSwapDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadgeKey(status: ShiftSwapRequest['status']): string {
  return status.toLowerCase()
}

export default function ShiftSwapsPage() {
  const [rows, setRows] = useState<ShiftSwapRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listShiftSwaps({ page: 1, limit: 50 })
      setRows(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  )

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      ALL: rows.length,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    }
    for (const row of rows) base[row.status] += 1
    return base
  }, [rows])

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('')
    try {
      await reviewShiftSwap(id, { status })
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Action impossible')
    }
  }

  const columns: Column<ShiftSwapRequest>[] = [
    {
      key: 'swapDate',
      label: 'Date',
      sortable: true,
      render: (_v, row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatSwapDate(row.swapDate)}
        </span>
      ),
    },
    {
      key: 'requester',
      label: 'Demandeur',
      render: (_v, row) => employeeDisplayName(row.requester),
    },
    {
      key: 'target',
      label: 'Cible',
      render: (_v, row) => (row.target ? employeeDisplayName(row.target) : '—'),
    },
    {
      key: 'shiftAssignment',
      label: 'Horaire',
      render: (_v, row) => row.shiftAssignment?.shiftTypeName ?? '—',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_v, row) => <StatusBadge status={statusBadgeKey(row.status)} />,
    },
    {
      key: 'reason',
      label: 'Motif',
      render: (_v, row) => (
        <span className="line-clamp-2 max-w-56 text-slate-600 dark:text-slate-300">
          {row.reason?.trim() || '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: 'Échanges de poste' }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/manager/inbox" className={secondaryBtnClass}>
              <i className="fa-solid fa-inbox" />
              Boite de réception
            </Link>
            <AddPageLink href="/shift-swaps/new" label="Nouvelle demande" />
          </div>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
              }`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-slate-500 dark:bg-black/20 dark:text-slate-300'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      <DataTable<ShiftSwapRequest>
        data={filtered}
        loading={loading}
        columns={columns}
        entityLabel="échanges"
        tableId="hs-shift-swaps-table"
        emptyMessage="Aucune demande d’échange pour ce filtre."
        actions={(row) => (
          <ActionButtons
            handleReview={(status: REVIEW_STATUS) => {
              void handleReview(row.id, status)
            }}
            reviewActions={
              row.status === 'PENDING'
                ? [
                    ...(row.target
                      ? [
                          {
                            label: 'Approuver',
                            actionStatus: 'APPROVED' as const,
                            cls: 'focus:outline-none bg-emerald-600 text-white hover:bg-emerald-700',
                          },
                        ]
                      : []),
                    {
                      label: 'Refuser',
                      actionStatus: 'REJECTED' as const,
                      cls: 'focus:outline-none bg-red-600 text-white hover:bg-red-700',
                    },
                  ]
                : []
            }
          />
        )}
      />
    </div>
  )
}
