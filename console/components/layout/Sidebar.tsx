'use client'

import BrandLogo from '@/components/brand/BrandLogo'
import { consoleNavSections, type NavItem } from '@/lib/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINK_BASE =
  'flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-600 rounded-lg hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 focus:text-primary dark:text-slate-300 dark:hover:bg-primary/15 dark:hover:text-accent dark:focus:text-accent'

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  if (!item.href) return null

  const isActive =
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <li>
      <Link
        href={item.href}
        className={`${LINK_BASE} ${isActive ? 'text-primary font-semibold' : ''}`}
      >
        {item.faIcon && <i className={`${item.faIcon} shrink-0 size-4`} />}
        {item.label}
      </Link>
    </li>
  )
}

export default function Sidebar() {
  return (
    <div
      id="hs-application-sidebar"
      className="hs-overlay [--auto-close:lg] hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform w-[260px] h-full hidden fixed inset-y-0 start-0 z-60 bg-surface-card border-e border-slate-200/80 lg:block lg:translate-x-0 lg:end-auto lg:bottom-0 dark:bg-surface-card-dark dark:border-border-dark"
      role="dialog"
      tabIndex={-1}
      aria-label="Sidebar"
    >
      <div className="relative flex flex-col h-full max-h-full">
        <div className="mx-3 mt-3 mb-2 rounded-xl">
          <Link
            href="/"
            className="flex items-center justify-start rounded-lg focus:outline-none focus:opacity-90"
            aria-label="Console Plateforme TimeGate"
          >
            <BrandLogo variant="full" tone="on-dark" className="max-h-12 w-auto" priority />
          </Link>
          <p className="mt-1 px-1 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Console plateforme
          </p>
        </div>

        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-track]:bg-surface-dark dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          <nav className="px-3 w-full flex flex-col flex-wrap">
            <ul className="flex flex-col space-y-1 mb-4">
              {consoleNavSections.map((section) => (
                <span key={section.title}>
                  <li className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 py-3">
                    {section.title}
                  </li>
                  {section.items.map((item) => (
                    <NavLink key={item.href ?? item.label} item={item} />
                  ))}
                </span>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mx-3 mt-3 mb-2 rounded-xl">
          <div className="h-12" />
        </div>
      </div>
    </div>
  )
}
