type DetailItem = {
  label: string
  value: React.ReactNode
}

type ResourceDetailSectionProps = {
  title: string
  items: DetailItem[]
}

export default function ResourceDetailSection({ title, items }: ResourceDetailSectionProps) {
  return (
    <div className="tg-card border-t-4 border-t-primary mb-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <dl className="space-y-3">
        {items.map((item) => (
          <div key={item.label}
            className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-border-dark px-5 py-3 last:border-0"
          >
            <dt className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {item.label}
            </dt>
            <dd className="text-sm text-slate-600 dark:text-slate-400">
              {item.value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
