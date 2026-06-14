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
    <div className="bg-white border border-gray-200 shadow-2xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700">
      <div className="border-b border-gray-200 px-5 py-3 dark:border-neutral-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400">
          {title}
        </h2>
      </div>
      <dl className="divide-y divide-gray-100 dark:divide-neutral-700">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-5 py-3">
            <dt className="text-sm text-gray-500 dark:text-neutral-400">{item.label}</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-neutral-100">
              {item.value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
