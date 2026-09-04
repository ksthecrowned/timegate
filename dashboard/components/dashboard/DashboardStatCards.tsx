import Link from 'next/link'
import { DashboardStatCardSparkline } from '@/components/dashboard/DashboardStatCardSparkline'

export function DashboardStatCard({
  label,
  value,
  href,
  icon,
  accent,
  hint,
  sparkline,
  sparklineColor,
}: {
  label: string
  value: number
  href: string
  icon: string
  accent?: string
  hint?: string
  sparkline?: number[]
  sparklineColor?: string
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col overflow-hidden tg-card shadow-2xs transition-colors hover:border-primary/40"
    >
      <div className="p-4 md:px-5 md:py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <i className={`${icon} ${accent ?? 'text-primary'}`} />
        </div>
        <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {value.toLocaleString('fr-FR')}
        </h3>
        {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
      {sparkline && sparkline.length > 0 ? (
        <div className="mt-auto pb-1">
          <DashboardStatCardSparkline data={sparkline} color={sparklineColor} />
        </div>
      ) : (
        <div className="h-14" aria-hidden />
      )}
    </Link>
  )
}

export function DashboardTodayMetric({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: number
  href?: string
  tone?: 'default' | 'warn' | 'danger' | 'ok'
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-amber-700 dark:text-amber-300'
      : tone === 'danger'
        ? 'text-red-700 dark:text-red-300'
        : tone === 'ok'
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-slate-900 dark:text-slate-100'

  const content = (
    <div className="rounded-lg border border-slate-200/80 bg-surface px-3 py-2.5 dark:border-border-dark dark:bg-surface-dark">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value.toLocaleString('fr-FR')}</p>
    </div>
  )

  if (!href) return content
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {content}
    </Link>
  )
}
