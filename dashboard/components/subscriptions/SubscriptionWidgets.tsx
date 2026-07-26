import type { SubscriptionStatus } from '@/lib/timegate/types'
import { subscriptionStatusLabel } from '@/lib/subscription-ui'

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus['status'] }) {
  if (!status) return <span className="text-slate-400">—</span>
  const map: Record<string, string> = {
    TRIAL: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    GRACE_READ_ONLY: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    SUSPENDED: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map.BLOCKED}`}
    >
      {subscriptionStatusLabel(status)}
    </span>
  )
}

export function SubscriptionUsageMeter({
  label,
  used,
  max,
}: {
  label: string
  used: number
  max: number
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const over = used >= max && max > 0
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {used} / {max}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{pct} % utilisés</p>
    </div>
  )
}
