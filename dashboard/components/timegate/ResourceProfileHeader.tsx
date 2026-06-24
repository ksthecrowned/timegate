import StatusBadge from '@/components/ui/StatusBadge'

type ResourceProfileHeaderProps = {
  title: string
  subtitle?: string
  meta?: string
  photoUrl?: string | null
  initials?: string
  isActive?: boolean
  children?: React.ReactNode
}

export default function ResourceProfileHeader({
  title,
  subtitle,
  meta,
  photoUrl,
  initials,
  isActive,
  children,
}: ResourceProfileHeaderProps) {
  const fallback = initials ?? title.slice(0, 2).toUpperCase()

  return (
    <div className="tg-card border border-slate-200/80 shadow-2xs rounded-xl dark:border-border-dark">
      <div className="h-24 bg-linear-to-r from-primary to-secondary rounded-t-xl" />
      <div className="px-5 pb-5 -mt-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div className="flex items-end gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="size-24 rounded-xl border-4 border-white dark:border-neutral-800 object-cover shadow-md"
              />
            ) : (
              <div className="size-24 rounded-xl border-4 border-white dark:border-neutral-800 bg-primary flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {fallback}
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-neutral-300 mt-0.5">{subtitle}</p>
              )}
              {meta && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{meta}</p>}
              {typeof isActive === 'boolean' && (
                <div className="mt-2">
                  <StatusBadge status={isActive ? 'active' : 'inactive'} />
                </div>
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
