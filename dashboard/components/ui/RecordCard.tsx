'use client'

import type { ReactNode } from 'react'

type RecordCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  selected?: boolean
  onClick?: () => void
}

const shellClass = (selected: boolean, interactive: boolean) =>
  [
    'bg-white border border-gray-200 rounded-xl p-4 dark:bg-neutral-900 dark:border-neutral-700',
    interactive ? 'hover:border-gray-300 dark:hover:border-neutral-600' : '',
    selected ? 'ring-2 ring-primary border-primary' : '',
  ]
    .filter(Boolean)
    .join(' ')

const selectButtonClass =
  'flex-1 min-w-0 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

function RecordCardHeader({
  title,
  subtitle,
  badge,
}: Pick<RecordCardProps, 'title' | 'subtitle' | 'badge'>) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        {badge}
      </div>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">{subtitle}</p>
      ) : null}
    </>
  )
}

export function RecordCard({
  title,
  subtitle,
  badge,
  actions,
  children,
  selected = false,
  onClick,
}: RecordCardProps) {
  const body = children ? (
    <dl className="mt-3 space-y-2">{children}</dl>
  ) : null

  if (onClick && !actions) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${shellClass(selected, true)} w-full cursor-pointer text-left`}
      >
        <RecordCardHeader title={title} subtitle={subtitle} badge={badge} />
        {body}
      </button>
    )
  }

  if (onClick && actions) {
    return (
      <div className={shellClass(selected, false)}>
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onClick} className={`${selectButtonClass} cursor-pointer`}>
            <RecordCardHeader title={title} subtitle={subtitle} badge={badge} />
            {body}
          </button>
          <div className="shrink-0">{actions}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={shellClass(selected, false)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <RecordCardHeader title={title} subtitle={subtitle} badge={badge} />
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {body}
    </div>
  )
}

export function RecordCardField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 text-sm sm:grid-cols-3">
      <dt className="text-gray-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-gray-900 sm:col-span-2 dark:text-neutral-200">{value ?? '—'}</dd>
    </div>
  )
}

type RecordCardListProps<T> = {
  items: T[]
  emptyMessage?: string
  loading?: boolean
  loadingSkeleton?: ReactNode
  renderItem: (item: T) => ReactNode
  keyFn?: (item: T, index: number) => string
}

export function RecordCardList<T>({
  items,
  emptyMessage = 'Aucun élément.',
  loading = false,
  loadingSkeleton,
  renderItem,
  keyFn,
}: RecordCardListProps<T>) {
  if (loading) {
    return loadingSkeleton ?? (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-neutral-400">Chargement…</p>
    )
  }

  const safeItems = items ?? []
  if (safeItems.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500 dark:text-neutral-400">{emptyMessage}</p>
    )
  }
  return (
    <div className="space-y-3">
      {safeItems.map((item, index) => (
        <div key={keyFn ? keyFn(item, index) : index}>{renderItem(item)}</div>
      ))}
    </div>
  )
}
