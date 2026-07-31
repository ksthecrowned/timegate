type DetailItem = {
  label: string
  value: React.ReactNode
}

type ResourceDetailSectionProps = {
  title: string
  items: DetailItem[]
  /** Panneau léger (sans barre primaire / carte lourde). */
  bare?: boolean
}

export default function ResourceDetailSection({
  title,
  items,
  bare = false,
}: ResourceDetailSectionProps) {
  const rows = (
    <dl className="divide-y divide-slate-200/70 dark:divide-border-dark">
      {items.map((item) => (
        <div key={item.label} className="grid gap-0.5 py-2.5 sm:grid-cols-3 sm:gap-3">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2 dark:text-slate-200">
            {item.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  )

  if (bare) {
    return (
      <section className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-border-dark dark:bg-white/3">
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        {rows}
      </section>
    )
  }

  return (
    <div className="tg-card mb-4 border-t-4 border-t-primary">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="px-5 py-1">{rows}</div>
    </div>
  )
}
