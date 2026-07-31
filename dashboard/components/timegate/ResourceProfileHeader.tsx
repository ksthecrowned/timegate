import StatusBadge from '@/components/ui/StatusBadge'

type ResourceProfileHeaderProps = {
  title: string
  subtitle?: string
  meta?: string
  photoUrl?: string | null
  initials?: string
  isActive?: boolean
  children?: React.ReactNode
  /** Sans coque tg-card (intégré dans un parent). */
  embedded?: boolean
}

export default function ResourceProfileHeader({
  title,
  subtitle,
  meta,
  photoUrl,
  initials,
  isActive,
  children,
  embedded = false,
}: ResourceProfileHeaderProps) {
  const fallback = (initials ?? title.slice(0, 2)).toUpperCase()

  const inner = (
    <div className={embedded ? 'px-4 py-4 md:px-5 md:py-5' : 'p-5'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              className="size-14 shrink-0 rounded-xl object-cover md:size-16"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-semibold text-white md:size-16 md:text-lg">
              {fallback}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white md:text-xl">
                {title}
              </h1>
              {typeof isActive === 'boolean' ? (
                <StatusBadge status={isActive ? 'active' : 'inactive'} />
              ) : null}
            </div>
            {(subtitle || meta) && (
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                {[subtitle, meta].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        {children ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </div>
  )

  if (embedded) return inner

  return (
    <div className="tg-card overflow-hidden rounded-xl border border-slate-200/80 shadow-2xs dark:border-border-dark">
      {inner}
    </div>
  )
}
