export function ApiErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
      {message}
    </div>
  )
}

export function DetailCard({
  title,
  children,
  actions,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="tg-card border-t-4 border-t-primary">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {actions}
      </div>
      <dl className="divide-y divide-slate-200/80 dark:divide-border-dark">{children}</dl>
    </div>
  )
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-4 md:grid-cols-3 md:px-5">
      <dt className="text-sm font-medium text-gray-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-sm text-gray-900 md:col-span-2 dark:text-neutral-200">{value ?? '—'}</dd>
    </div>
  )
}

export function FormCard({
  title,
  children,
  footer,
}: {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="tg-card border-t-4 border-t-primary">
      <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-4 md:p-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
          {footer}
        </div>
      )}
    </div>
  )
}

export const primaryBtnClass =
  'py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-primary text-white shadow-sm hover:bg-secondary disabled:opacity-50 transition-colors'

export const secondaryBtnClass =
  'py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-slate-200 bg-surface-card text-slate-700 hover:bg-slate-50 dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:hover:bg-surface-card-dark'
