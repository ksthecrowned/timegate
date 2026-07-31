'use client'

import { formatApiDate } from '@/lib/date-utils'
import { formatMoney } from '@/lib/money'
import type { PayrollLine } from '@/lib/timegate/types'

type ExplainItem = {
  label?: string
  kind?: string
  amount?: number
}

type ExplainJson = {
  ruleVersion?: string
  lateMinutes?: number
  overtimeMinutes?: number
  unjustifiedAbsences?: number
  scheduledWorkDays?: number
  workDaysDivisor?: number
  dailyRate?: number
  hourlyRate?: number
  lateMinutesPenalty?: number
  absenceAmount?: number
  overtimeAmount?: number
  fixedAllowancesTotal?: number
  variableAllowancesTotal?: number
  fixedItems?: ExplainItem[]
  variableItems?: ExplainItem[]
  seeded?: boolean
  plain?: boolean
}

function asExplain(value: Record<string, unknown> | null | undefined): ExplainJson {
  return (value ?? {}) as ExplainJson
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}

function ItemList({
  title,
  items,
}: {
  title: string
  items: ExplainItem[]
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, idx) => {
          const amount = Number(item.amount ?? 0)
          const sign = item.kind === 'DEDUCTION' ? -1 : 1
          const signed = amount * sign
          return (
            <li
              key={`${item.label ?? 'item'}-${idx}`}
              className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <span className="truncate">
                {item.label ?? 'Élément'}
                {item.kind === 'DEDUCTION' ? (
                  <span className="ml-1 text-xs text-slate-400">(retenue)</span>
                ) : null}
              </span>
              <span
                className={
                  signed < 0
                    ? 'shrink-0 tabular-nums text-red-600 dark:text-red-400'
                    : 'shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400'
                }
              >
                {signed < 0 ? '−' : '+'}
                {formatMoney(Math.abs(signed))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function PayrollLineExplainPanel({ line }: { line: PayrollLine }) {
  const explain = asExplain(line.explainJson)
  const fixedItems = Array.isArray(explain.fixedItems) ? explain.fixedItems : []
  const variableItems = Array.isArray(explain.variableItems) ? explain.variableItems : []

  const lateMinutes = Number(explain.lateMinutes ?? 0)
  const overtimeMinutes = Number(explain.overtimeMinutes ?? 0)
  const unjustifiedAbsences = Number(explain.unjustifiedAbsences ?? 0)
  const workDaysDivisor = Number(explain.workDaysDivisor ?? 0)
  const dailyRate = Number(explain.dailyRate ?? 0)
  const hourlyRate = Number(explain.hourlyRate ?? 0)

  return (
    <div className="space-y-3" data-tour="payroll-line-explain">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Détail du calcul</p>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Salaire de base" value={formatMoney(line.baseSalary)} />
        <Metric label="Brut" value={formatMoney(line.gross ?? 0)} />
        <Metric label="Net" value={formatMoney(line.netSalary)} />
        <Metric
          label="Taux horaire"
          value={hourlyRate ? formatMoney(hourlyRate) : '—'}
        />
        <Metric
          label="Date de paiement"
          value={line.paidAt ? formatApiDate(line.paidAt) : '—'}
        />
      </dl>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Heures supp."
          value={
            overtimeMinutes || line.overtimeAmount
              ? `${overtimeMinutes ? `${overtimeMinutes} min · ` : ''}+${formatMoney(line.overtimeAmount)}`
              : '—'
          }
        />
        <Metric
          label="Retards"
          value={
            lateMinutes || line.lateMinutesPenalty
              ? `${lateMinutes ? `${lateMinutes} min · ` : ''}−${formatMoney(line.lateMinutesPenalty)}`
              : '—'
          }
        />
        <Metric
          label="Absences"
          value={
            unjustifiedAbsences || line.absenceAmount
              ? `${unjustifiedAbsences ? `${unjustifiedAbsences} j · ` : ''}−${formatMoney(line.absenceAmount)}`
              : '—'
          }
        />
        <Metric
          label="Jours ouvrés (diviseur)"
          value={
            workDaysDivisor
              ? `${workDaysDivisor}${dailyRate ? ` · ${formatMoney(dailyRate)}/j` : ''}`
              : '—'
          }
        />
      </div>

      {(fixedItems.length > 0 || variableItems.length > 0) && (
        <div className="grid gap-4 border-t border-slate-200/80 pt-3 sm:grid-cols-2 dark:border-border-dark">
          <ItemList title="Indemnités / retenues fixes" items={fixedItems} />
          <ItemList title="Éléments variables" items={variableItems} />
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Brut = base + indemnités + HS · Net = brut − pénalités − retenues
      </p>
    </div>
  )
}
