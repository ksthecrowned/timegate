const pulse = 'animate-pulse bg-slate-200 dark:bg-slate-700'

export function SkeletonBlock({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <div className={`${pulse} rounded-lg ${className}`} style={style} aria-hidden />
}

export function SkeletonStatCard() {
  return (
    <div className="tg-card shadow-xs">
      <div className="p-4 md:px-5 md:py-6">
        <div className="flex items-center justify-between gap-2">
          <SkeletonBlock className="h-3 w-20 rounded-full" />
          <SkeletonBlock className="size-4 rounded-full shrink-0" />
        </div>
        <SkeletonBlock className="mt-3 h-8 w-16" />
      </div>
    </div>
  )
}

export function SkeletonChartCard() {
  return (
    <div className="tg-card p-5">
      <SkeletonBlock className="h-4 w-40 mb-2" />
      <SkeletonBlock className="h-3 w-56 mb-4 rounded-full" />
      <div className="flex h-[260px] items-end gap-2 pt-4">
        {[65, 45, 80, 55, 70, 40, 85, 50, 75, 60].map((h, i) => (
          <SkeletonBlock key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={`a-${i}`} />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={`b-${i}`} />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonChartCard key={`c-${i}`} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonDataTableBody({
  columns = 5,
  rows = 8,
  hasActions = true,
}: {
  columns?: number
  rows?: number
  hasActions?: boolean
}) {
  const colCount = columns + (hasActions ? 1 : 0)
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: colCount }).map((__, colIndex) => (
            <td key={colIndex} className="p-3">
              <SkeletonBlock
                className={`h-3 ${colIndex === 0 ? 'w-3/4' : colIndex === colCount - 1 && hasActions ? 'w-20 ms-auto' : 'w-1/2'}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonDetailCard({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="tg-card p-5"
      aria-busy="true"
      aria-label="Chargement"
    >
      <SkeletonBlock className="h-5 w-48 mb-5" />
      <dl className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <SkeletonBlock className="h-3 w-28 shrink-0 rounded-full" />
            <SkeletonBlock className="h-3 w-full max-w-md rounded-full" />
          </div>
        ))}
      </dl>
    </div>
  )
}

export function SkeletonFormCard({ fields = 4 }: { fields?: number }) {
  return (
    <div
      className="tg-card p-5"
      aria-busy="true"
      aria-label="Chargement"
    >
      <SkeletonBlock className="h-5 w-40 mb-6" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="h-[46px] w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="flex items-center gap-x-2 my-5 lg:my-2">
        <SkeletonBlock className="size-4 rounded-full shrink-0" />
        <SkeletonBlock className="w-32 h-4 rounded-full" />
      </div>
      <div className="flex flex-col w-full mx-auto tg-card border-t-4 border-t-primary mb-4 shadow-xs">
        <div className="py-4 md:py-5 px-3">
          <div className="flex items-center space-x-2 mb-4">
            <SkeletonBlock className="w-48 h-8" />
            <div className="flex-1 flex items-center justify-end space-x-2">
              <SkeletonBlock className="w-8 h-8" />
              <SkeletonBlock className="w-16 h-8" />
              <SkeletonBlock className="w-12 h-8" />
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-x-4 py-3 border-b border-slate-200/80 dark:border-border-dark"
              >
                <SkeletonBlock className="size-[62px] shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="w-1/2 h-3 rounded-full" />
                  <SkeletonBlock className="w-1/4 h-3 rounded-full" />
                </div>
                <SkeletonBlock className="w-24 h-3 rounded-full" />
                <SkeletonBlock className="w-24 h-3 rounded-full" />
                <SkeletonBlock className="w-16 h-3 rounded-full" />
                <SkeletonBlock className="w-16 h-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return <SkeletonStatCard />
}

export function SkeletonTable() {
  return <SkeletonPage />
}
