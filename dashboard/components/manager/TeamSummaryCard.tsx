'use client'

import type { TeamMemberStatus } from '@/lib/timegate/manager'

export const TEAM_STATUS_STYLES: Record<
  TeamMemberStatus,
  { badge: string; dot: string; icon: string }
> = {
  PRESENT: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: 'fa-circle-check',
  },
  ABSENT: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
    icon: 'fa-user-xmark',
  },
  LATE: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
    icon: 'fa-clock',
  },
  ON_BREAK: {
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    dot: 'bg-sky-500',
    icon: 'fa-mug-saucer',
  },
  ON_LEAVE: {
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    dot: 'bg-violet-500',
    icon: 'fa-umbrella-beach',
  },
  REVIEW_REQUIRED: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
    icon: 'fa-triangle-exclamation',
  },
  OFF: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    dot: 'bg-slate-400',
    icon: 'fa-moon',
  },
  EXPECTED: {
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    icon: 'fa-calendar-day',
  },
}

export function TeamSummaryCard({
  label,
  value,
  icon,
  accent,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: string
  accent: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-surface-card p-3.5 text-left shadow-sm transition-all dark:bg-surface-card-dark ${
        active
          ? 'border-primary/40 ring-2 ring-primary/25'
          : 'border-slate-200/80 hover:border-primary/25 dark:border-border-dark'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex size-8 items-center justify-center rounded-lg ${accent}`}
          aria-hidden
        >
          <i className={`fa-solid ${icon} text-xs`} />
        </div>
        <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </button>
  )
}
