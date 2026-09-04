'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import EmployeeTableCell from '@/components/timegate/EmployeeTableCell'
import PayrollLineExplainPanel from '@/components/timegate/PayrollLineExplainPanel'
import { SelectSearch } from '@/components/ui/SelectSearch'
import type { SelectOption } from '@/components/ui/select-search-types'
import { DatePicker } from '@/components/ui/DatePicker'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatApiDate, toIsoDate } from '@/lib/date-utils'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { HttpError } from '@/lib/http'
import { listBranches } from '@/lib/timegate/branches'
import { listPayGroups } from '@/lib/timegate/pay-groups'
import {
  formatMoney,
  getPayrollRunLines,
  markLinesPaid,
  type PayrollLinesQuery,
} from '@/lib/timegate/payroll-runs'
import type { PayrollLine, PayrollLinePaymentStatus, PayrollRunStatus } from '@/lib/timegate/types'

const ALL_BRANCH_OPTION: SelectOption = { value: '', label: 'Toutes les branches' }
const ALL_PAY_GROUP_OPTION: SelectOption = { value: '', label: 'Tous les groupes' }
const PAYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tous statuts' },
  { value: 'UNPAID', label: 'Non payé' },
  { value: 'PAID', label: 'Payé' },
]

function paymentStatusBadge(status?: PayrollLinePaymentStatus) {
  return status === 'PAID' ? <StatusBadge status="Payé" /> : <StatusBadge status="pending" />
}

function formatSigned(value: number): string {
  if (!value) return '—'
  const formatted = formatMoney(Math.abs(value))
  return value > 0 ? `+${formatted}` : `-${formatted}`
}

function signedClass(value: number): string {
  if (!value) return 'text-slate-500 dark:text-slate-400'
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

type Props = {
  runId: string
  runStatus?: PayrollRunStatus
  refreshKey?: number
  onChanged?: () => void
  onLinesLoaded?: (lines: PayrollLine[]) => void
}

export default function PayrollLinesPaymentTable({
  runId,
  runStatus,
  refreshKey,
  onChanged,
  onLinesLoaded,
}: Props) {
  const [lines, setLines] = useState<PayrollLine[]>([])
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([ALL_BRANCH_OPTION])
  const [payGroupOptions, setPayGroupOptions] = useState<SelectOption[]>([ALL_PAY_GROUP_OPTION])
  const [branchId, setBranchId] = useState('')
  const [payGroupId, setPayGroupId] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PayrollLinePaymentStatus | ''>('')
  const [dueFrom, setDueFrom] = useState<Date | null>(null)
  const [dueTo, setDueTo] = useState<Date | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paidAt, setPaidAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) =>
      setBranchOptions([ALL_BRANCH_OPTION, ...toSelectOptions(res.data)]),
    )
    void listPayGroups({ limit: 100 }).then((res) =>
      setPayGroupOptions([ALL_PAY_GROUP_OPTION, ...toSelectOptions(res.data)]),
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query: PayrollLinesQuery = { limit: 1000 }
      if (branchId) query.branchId = branchId
      if (payGroupId) query.payGroupId = payGroupId
      if (paymentStatus) query.paymentStatus = paymentStatus
      if (dueFrom) query.dueFrom = toIsoDate(dueFrom)
      if (dueTo) query.dueTo = toIsoDate(dueTo)
      const res = await getPayrollRunLines(runId, query)
      const next = Array.isArray(res) ? res : []
      setLines(next)
      setSelected(new Set())
      onLinesLoaded?.(next)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement des lignes impossible.')
    } finally {
      setLoading(false)
    }
  }, [runId, branchId, payGroupId, paymentStatus, dueFrom, dueTo, onLinesLoaded])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const selectableLines = useMemo(() => lines.filter((l) => l.paymentStatus !== 'PAID'), [lines])
  const allSelected = selectableLines.length > 0 && selectableLines.every((l) => selected.has(l.id))
  const hasActiveFilters = Boolean(branchId || payGroupId || paymentStatus || dueFrom || dueTo)
  const canMarkPaid = runStatus === 'LOCKED' || runStatus === 'PARTIALLY_PAID'

  function toggleLine(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableLines.map((l) => l.id)))
  }

  function resetFilters() {
    setBranchId('')
    setPayGroupId('')
    setPaymentStatus('')
    setDueFrom(null)
    setDueTo(null)
  }

  async function handleMarkPaid() {
    if (selected.size === 0) return
    if (!window.confirm(`Marquer ${selected.size} ligne(s) comme payée(s) ?`)) return
    setMarking(true)
    setError('')
    setMessage('')
    try {
      await markLinesPaid(runId, {
        lineIds: [...selected],
        ...(paidAt ? { paidAt: toIsoDate(paidAt) } : {}),
      })
      setMessage(`${selected.size} ligne(s) marquée(s) payée(s).`)
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Marquage impossible.')
    } finally {
      setMarking(false)
    }
  }

  // Employé + Base + Maj. fixes + Brut/Net + échéance/paiement + détail (+ checkbox/payer)
  const columnCount = (canMarkPaid ? 2 : 0) + 8

  function isOverdue(line: PayrollLine): boolean {
    if (line.paymentStatus === 'PAID' || !line.dueDate) return false
    const due = line.dueDate.slice(0, 10)
    const today = toIsoDate(new Date())
    return due < today
  }

  async function handleMarkOne(lineId: string) {
    if (!window.confirm('Marquer cette ligne comme payée ?')) return
    setMarking(true)
    setError('')
    setMessage('')
    try {
      await markLinesPaid(runId, {
        lineIds: [lineId],
        ...(paidAt ? { paidAt: toIsoDate(paidAt) } : {}),
      })
      setMessage('1 ligne marquée payée.')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Marquage impossible.')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="tg-card border-t-4 border-t-primary mb-4">
      <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lignes de paie</h2>
      </div>

      <div className="px-4 pt-4 md:px-5">
        <ApiErrorBanner message={error} />
        {message ? (
          <p className="mb-4 rounded-lg border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3 px-4 pb-4 md:px-5">
        <div className="min-w-40 flex-1 sm:max-w-56">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Branche</label>
          <SelectSearch
            instanceId="payment-table-branch"
            variant="toolbar"
            options={branchOptions}
            value={findOption(branchOptions, branchId) ?? ALL_BRANCH_OPTION}
            onChange={(opt) => setBranchId(opt?.value ?? '')}
          />
        </div>
        <div className="min-w-40 flex-1 sm:max-w-56">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Groupe de paie
          </label>
          <SelectSearch
            instanceId="payment-table-paygroup"
            variant="toolbar"
            options={payGroupOptions}
            value={findOption(payGroupOptions, payGroupId) ?? ALL_PAY_GROUP_OPTION}
            onChange={(opt) => setPayGroupId(opt?.value ?? '')}
          />
        </div>
        <div className="min-w-40 flex-1 sm:max-w-48">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Statut paiement
          </label>
          <SelectSearch
            instanceId="payment-table-status"
            variant="toolbar"
            options={PAYMENT_STATUS_OPTIONS}
            value={findOption(PAYMENT_STATUS_OPTIONS, paymentStatus) ?? PAYMENT_STATUS_OPTIONS[0]}
            onChange={(opt) => setPaymentStatus((opt?.value as PayrollLinePaymentStatus | '') ?? '')}
          />
        </div>
        <div className="min-w-36">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Échéance du
          </label>
          <DatePicker value={dueFrom} onChange={setDueFrom} variant="toolbar" placeholder="Début" />
        </div>
        <div className="min-w-36">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Échéance au
          </label>
          <DatePicker value={dueTo} onChange={setDueTo} variant="toolbar" placeholder="Fin" />
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className={`${secondaryBtnClass} py-2! px-3! text-xs`}
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {canMarkPaid ? (
        <div className="flex flex-wrap items-center gap-3 border-y border-slate-200/80 bg-slate-50/60 px-4 py-3 md:px-5 dark:border-border-dark dark:bg-white/5">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={selectableLines.length === 0}
              onChange={toggleSelectAll}
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Tout sélectionner ({selectableLines.length} non payée(s) filtrée(s))
            </span>
          </label>
          <div className="w-40">
            <DatePicker
              value={paidAt}
              onChange={setPaidAt}
              variant="toolbar"
              placeholder="Date de paiement"
            />
          </div>
          <button
            type="button"
            disabled={marking || selected.size === 0}
            onClick={() => void handleMarkPaid()}
            className={`${primaryBtnClass} py-2! px-3! text-sm`}
          >
            {marking ? 'Marquage…' : `Marquer payées (${selected.size})`}
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto px-4 pb-4 md:px-5">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-700">
              {canMarkPaid ? <th className="w-8 py-2 pr-2 font-semibold" /> : null}
              <th className="py-2 pr-3 font-semibold">Employé</th>
              <th className="py-2 pr-3 font-semibold">Base</th>
              <th className="py-2 pr-3 font-semibold">Maj. fixes</th>
              <th className="py-2 pr-3 font-semibold">Brut</th>
              <th className="py-2 pr-3 font-semibold">Net</th>
              <th className="py-2 pr-3 font-semibold">Échéance</th>
              <th className="py-2 pr-3 font-semibold">Paiement</th>
              <th className="w-10 py-2 font-semibold" />
              {canMarkPaid ? <th className="py-2 font-semibold" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="py-6 text-center text-slate-500 dark:text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="py-6 text-center text-slate-500 dark:text-slate-400">
                  Aucune ligne pour ces filtres.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const isPaid = line.paymentStatus === 'PAID'
                const overdue = isOverdue(line)
                const isExpanded = expandedId === line.id
                const fixedNet =
                  (line.fixedAllowancesTotal ?? 0) - (line.fixedDeductionsTotal ?? 0)
                return (
                  <Fragment key={line.id}>
                    <tr
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        isExpanded ? 'bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      {canMarkPaid ? (
                        <td className="py-2 pr-2">
                          <input
                            type="checkbox"
                            checked={selected.has(line.id)}
                            disabled={isPaid}
                            onChange={() => toggleLine(line.id)}
                            className="size-4 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-40"
                            aria-label={`Sélectionner la ligne de ${line.employeeId}`}
                          />
                        </td>
                      ) : null}
                      <td className="py-2 pr-3">
                        <EmployeeTableCell employee={line.employee ?? null} />
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatMoney(line.baseSalary)}</td>
                      <td className={`py-2 pr-3 tabular-nums ${signedClass(fixedNet)}`}>
                        {formatSigned(fixedNet)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{formatMoney(line.gross)}</td>
                      <td className="py-2 pr-3 font-semibold tabular-nums">
                        {formatMoney(line.netSalary)}
                      </td>
                      <td
                        className={`py-2 pr-3 ${
                          overdue
                            ? 'font-medium text-amber-700 dark:text-amber-300'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {formatApiDate(line.dueDate)}
                        {overdue ? (
                          <span className="ml-1 text-xs uppercase tracking-wide">retard</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">{paymentStatusBadge(line.paymentStatus)}</td>
                      <td className="py-2 text-right">
                        {line.explainJson ? (
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Masquer' : 'Détails'}
                            onClick={() =>
                              setExpandedId((prev) => (prev === line.id ? null : line.id))
                            }
                          >
                            <i
                              className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`}
                              aria-hidden
                            />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      {canMarkPaid ? (
                        <td className="py-2 text-right">
                          {!isPaid ? (
                            <button
                              type="button"
                              disabled={marking}
                              onClick={() => void handleMarkOne(line.id)}
                              className="text-sm text-primary hover:underline disabled:opacity-50"
                            >
                              Payer
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                    {isExpanded ? (
                      <tr className="bg-slate-50/70 dark:bg-white/3">
                        <td colSpan={columnCount} className="p-0">
                          <div className="border-t border-slate-200/80 px-4 py-3 dark:border-border-dark">
                            <PayrollLineExplainPanel line={line} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
