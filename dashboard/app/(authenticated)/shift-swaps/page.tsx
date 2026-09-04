'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { ApiErrorBanner, secondaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { type Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { REVIEW_STATUS } from '@/constants'
import { formatApiDate } from '@/lib/date-utils'
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

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; icon: string }> = [
  { key: 'ALL', label: 'Tous', icon: 'fa-layer-group' },
  { key: 'PENDING', label: 'En attente', icon: 'fa-clock' },
  { key: 'APPROVED', label: 'Approuvés', icon: 'fa-circle-check' },
  { key: 'REJECTED', label: 'Refusés', icon: 'fa-circle-xmark' },
  { key: 'CANCELLED', label: 'Annulés', icon: 'fa-ban' },
]

function formatSwapDate(iso: string): string {
  return formatApiDate(iso)
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

      <div className="overflow-x-auto border-b border-slate-200/80 dark:border-border-dark">
        <nav
          className="flex min-w-max gap-0 px-1"
          role="tablist"
          aria-label="Filtrer par statut"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key
            const count = counts[f.key]
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.key)}
                className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 pt-0 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
                }`}
              >
                <i className={`fa-solid ${f.icon} text-xs opacity-70`} aria-hidden />
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
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
