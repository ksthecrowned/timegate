import type { ReactNode } from 'react'
import { formatMoney } from '@/lib/timegate/payroll-runs'
import type { PayrollRun } from '@/lib/timegate/types'

function StatTile({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-surface-card px-4 py-3 dark:border-border-dark dark:bg-surface-card-dark">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-slate-900 dark:text-white ${valueClassName ?? ''}`}>
        {value}
      </p>
    </div>
  )
}

export default function PayrollRunMassBanner({ run }: { run: PayrollRun }) {
  const totals = run.totals
  const progress = run.paymentProgress

  if (!totals || !progress) return null

  const percent = Math.min(100, Math.max(0, progress.percentPaid ?? 0))
  const hasUnpaid = progress.unpaidCount > 0

  return (
    <div className="tg-card border-t-4 border-t-primary mb-4">
      <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Masse salariale</h2>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-4">
        <StatTile label="Brut total" value={formatMoney(totals.gross)} />
        <StatTile label="Net total" value={formatMoney(totals.net)} valueClassName="text-primary" />
        <StatTile label="Base" value={formatMoney(totals.baseSalary)} />
        <StatTile
          label="Heures sup."
          value={totals.overtime ? `+${formatMoney(totals.overtime)}` : '—'}
        />
        <StatTile
          label="Indemnités fixes"
          value={totals.fixedAllowances ? `+${formatMoney(totals.fixedAllowances)}` : '—'}
        />
        <StatTile
          label="Retenues fixes"
          value={totals.fixedDeductions ? `-${formatMoney(totals.fixedDeductions)}` : '—'}
        />
        <StatTile
          label="Indemnités variables"
          value={totals.variableAllowances ? `+${formatMoney(totals.variableAllowances)}` : '—'}
        />
        <StatTile
          label="Pénalités"
          value={totals.penalties ? `-${formatMoney(totals.penalties)}` : '—'}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5 dark:border-border-dark">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Avancement des paiements</span>
            <span className="text-slate-500 dark:text-slate-400">
              {progress.paidCount}/{progress.linesCount} payées ({percent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {hasUnpaid ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <i className="fa-solid fa-clock" aria-hidden />
            {progress.unpaidCount} ligne(s) en attente de paiement
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <i className="fa-solid fa-circle-check" aria-hidden />
            Toutes les lignes sont payées
          </span>
        )}
      </div>
    </div>
  )
}
