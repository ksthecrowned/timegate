'use client'

import { dateTableColumn } from '@/components/timegate/date-table-column'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { ApiErrorBanner } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { type Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { parseApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { deleteEmployeeContract, listEmployeeContracts } from '@/lib/timegate/contracts'
import type { EmployeeContract } from '@/lib/timegate/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

type StatusFilter = '' | 'current' | 'expiring' | 'expired' | 'past'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: '', label: 'Tous' },
  { id: 'current', label: 'Courants' },
  { id: 'expiring', label: 'Expire bientôt' },
  { id: 'expired', label: 'Expirés' },
  { id: 'past', label: 'Historique' },
]

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function contractExpiryBadge(expiresAt?: string | null): 'Expiré' | 'Expire bientôt' | null {
  if (!expiresAt) return null
  const end = parseApiDate(expiresAt)
  if (!end) return null
  const today = startOfLocalDay(new Date())
  const endDay = startOfLocalDay(end)
  const days = Math.round((endDay.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'Expiré'
  if (days <= 30) return 'Expire bientôt'
  return null
}

function ContractStatusCell({ row }: { row: EmployeeContract }) {
  const expiry = contractExpiryBadge(row.expiresAt)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.isCurrent ? <StatusBadge status="Courant" /> : (
        <StatusBadge status="Historique" />
      )}
      {expiry ? <StatusBadge status={expiry} /> : null}
    </div>
  )
}

const columns: Column<EmployeeContract>[] = [
  employeeTableColumn<EmployeeContract>({ sortable: true }),
  dateTableColumn<EmployeeContract>('signedAt', 'Signature', { sortable: true }),
  dateTableColumn<EmployeeContract>('expiresAt', 'Expiration', { sortable: true }),
  {
    key: 'renewalsCount',
    label: 'Renouvellements',
    sortable: true,
    render: (v) => String(v ?? 0),
  },
  {
    key: 'isCurrent',
    label: 'Statut',
    render: (_, row) => <ContractStatusCell row={row} />,
  },
  {
    key: 'contractFileUrl',
    label: 'Fichier',
    render: (_, row) =>
      row.contractFileUrl ? (
        <a
          href={row.contractFileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Ouvrir
        </a>
      ) : (
        '—'
      ),
  },
  {
    key: 'notes',
    label: 'Notes',
    render: (v) => {
      const notes = typeof v === 'string' ? v : ''
      if (!notes) return '—'
      return notes.length > 60 ? `${notes.slice(0, 60).trimEnd()}…` : notes
    },
  },
]

export default function ContractsPage() {
  const [data, setData] = useState<EmployeeContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('current')
  const [counts, setCounts] = useState<Record<StatusFilter, number>>({
    '': 0,
    current: 0,
    expiring: 0,
    expired: 0,
    past: 0,
  })

  const loadCounts = useCallback(async () => {
    try {
      const [all, current, expiring, expired, past] = await Promise.all([
        listEmployeeContracts({ page: 1, limit: 1 }),
        listEmployeeContracts({ page: 1, limit: 1, status: 'current' }),
        listEmployeeContracts({ page: 1, limit: 1, status: 'expiring' }),
        listEmployeeContracts({ page: 1, limit: 1, status: 'expired' }),
        listEmployeeContracts({ page: 1, limit: 1, status: 'past' }),
      ])
      setCounts({
        '': all.meta.total,
        current: current.meta.total,
        expiring: expiring.meta.total,
        expired: expired.meta.total,
        past: past.meta.total,
      })
    } catch {
      // compteurs optionnels — la liste principale gère l’erreur
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listEmployeeContracts({
        page: 1,
        limit: 100,
        ...(status ? { status } : {}),
      })
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

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  const filterBar = useMemo(
    () => (
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = status === f.id
          const count = counts[f.id]
          return (
            <button
              key={f.id || 'all'}
              type="button"
              onClick={() => setStatus(f.id)}
              className={[
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/15 dark:text-teal-300'
                  : 'border-slate-200/80 bg-surface-card text-slate-600 hover:bg-slate-50 dark:border-border-dark dark:bg-surface-card-dark dark:text-slate-300 dark:hover:bg-surface-elevated-dark',
              ].join(' ')}
            >
              {f.label}
              <span
                className={[
                  'rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                  active
                    ? 'bg-primary/15 text-primary dark:text-teal-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400',
                ].join(' ')}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
    ),
    [counts, status],
  )

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Ressources humaines', href: '/employees' },
          { label: 'Contrats' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {filterBar}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="contrats"
        tableId="hs-contracts-table"
        emptyMessage="Aucun contrat trouvé."
        actions={(row) => (
          <ActionButtons
            viewHref={`/employees/${row.employeeId}?tab=contracts`}
            onDelete={() => {
              void deleteEmployeeContract(row.employeeId, row.id).then(() => {
                void load()
                void loadCounts()
              })
            }}
            deleteMessage="Supprimer définitivement ce contrat ?"
          />
        )}
      />
    </div>
  )
}
