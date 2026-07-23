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
      className="shrink-0 mx-2 size-4 text-gray-400 dark:text-neutral-600"
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

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <ol className="flex items-center whitespace-nowrap">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="flex items-center text-sm text-gray-500 hover:text-primary focus:outline-none focus:text-primary dark:text-neutral-500 dark:hover:text-secondary dark:focus:text-secondary"
          >
            <svg
              className="shrink-0 me-3 size-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 9 9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m6.364 2.636-2.121 2.121M21 12h-3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m12 12 3.5-3.5" />
            </svg>
            Dashboard
          </Link>
          {crumbs.length > 0 ? <CrumbSeparator /> : null}
        </li>
        {crumbs.map((b, i) => {
          const isLast = i === crumbs.length - 1
          const href = b.href ?? '#'

          return (
            <li key={`${b.label}-${i}`} className="inline-flex items-center">
              {isLast ? (
                <span
                  className="inline-flex items-center text-sm font-semibold text-gray-800 truncate dark:text-neutral-200"
                  aria-current="page"
                >
                  {b.label}
                </span>
              ) : (
                <>
                  <Link
                    href={href}
                    className="flex items-center text-sm text-gray-500 hover:text-primary focus:outline-none focus:text-primary dark:text-neutral-500 dark:hover:text-secondary"
                  >
                    {b.label}
                  </Link>
                  <CrumbSeparator />
                </>
              )}
            </li>
          )
        })}
      </ol>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
