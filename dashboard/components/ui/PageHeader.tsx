import Link from 'next/link'

interface Crumb {
  label: string
  href?: string
  faIcon?: string // kept for compat, unused
}

interface PageHeaderProps {
  breadcrumbs?: Crumb[]
  action?: React.ReactNode
}

function CrumbSeparator() {
  return (
    <svg
      className="mx-1.5 size-3.5 shrink-0 text-slate-400 dark:text-slate-600"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default function PageHeader({ breadcrumbs, action }: PageHeaderProps) {
  const crumbs = breadcrumbs ?? []
  const pageTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1]?.label : 'Dashboard'
  const trail = crumbs.length > 1 ? crumbs.slice(0, -1) : []

  return (
    <div className="mb-5 rounded-xl border border-slate-200/80 bg-surface-card px-4 py-3 shadow-xs dark:border-border-dark dark:bg-surface-card-dark md:px-5 md:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <ol className="flex min-w-0 items-center whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="inline-flex items-center rounded-md px-1.5 py-0.5 hover:bg-primary/10 hover:text-primary focus:outline-none focus:text-primary dark:hover:bg-primary/15 dark:hover:text-teal-300 dark:focus:text-teal-300"
              >
                <svg
                  className="me-1.5 size-3.5 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v3m6.364 2.636-2.121 2.121M21 12h-3"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m12 12 3.5-3.5" />
                </svg>
                Dashboard
              </Link>
              <CrumbSeparator />
            </li>
            {trail.map((b, i) => (
              <li key={`${b.label}-${i}`} className="inline-flex items-center">
                <Link
                  href={b.href ?? '#'}
                  className="inline-flex items-center rounded-md px-1.5 py-0.5 hover:bg-primary/10 hover:text-primary focus:outline-none focus:text-primary dark:hover:bg-primary/15 dark:hover:text-teal-300 dark:focus:text-teal-300"
                >
                  {b.label}
                </Link>
                <CrumbSeparator />
              </li>
            ))}
            <li
              className="inline-flex max-w-[40ch] items-center truncate rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary dark:bg-primary/15 dark:text-teal-300"
              aria-current="page"
            >
              {pageTitle}
            </li>
          </ol>

          <h1 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100 md:text-xl">
            {pageTitle}
          </h1>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
