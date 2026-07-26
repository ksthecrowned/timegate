'use client'

import OrgLogo from '@/components/brand/OrgLogo'
import SidebarPlanWidget from '@/components/layout/SidebarPlanWidget'
import { getNavSectionsForRole, type NavItem } from '@/lib/navigation'
import type { TimeGateRole } from '@/lib/timegate/types'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const LINK_BASE =
  'flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-600 rounded-lg hover:bg-primary/10 hover:text-primary focus:outline-none focus:bg-primary/10 focus:text-primary dark:text-slate-300 dark:hover:bg-primary/15 dark:hover:text-accent dark:focus:text-accent line-clamp-1'
const TOGGLE_BASE =
  'hs-accordion-toggle w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-600 rounded-lg hover:bg-primary/10 hover:text-primary focus:outline-none dark:text-slate-300 dark:hover:bg-primary/15 dark:hover:text-accent line-clamp-1'

function AccordionItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + '/')
    : false

  if (item.href && !item.children) {
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

  const isLeafParent = item.children?.every((c) => !c.children)

  return (
    <li className="hs-accordion">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={TOGGLE_BASE}
        aria-expanded={open}
      >
        {item.faIcon && <i className={`${item.faIcon} shrink-0 size-4`} />}
        {item.label}
        <svg
          className={`ms-auto size-4 ${open ? 'block' : 'hidden'}`}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
        <svg
          className={`ms-auto size-4 ${open ? 'hidden' : 'block'}`}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="hs-accordion-content w-full overflow-hidden transition-[height] duration-300">
          {isLeafParent ? (
            <ul className="marker:text-neutral-400/80 list-disc ps-8 space-y-2 pt-1">
              {item.children?.map((child, i) => (
                <li key={i}>
                  <Link
                    href={child.href ?? '#'}
                    className={`${LINK_BASE} ${
                      child.href &&
                      (pathname === child.href || pathname.startsWith(child.href + '/'))
                        ? 'text-primary font-semibold'
                        : ''
                    }`}
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={`hs-accordion-group ${depth === 0 ? 'ps-8' : 'ps-6'} pt-1 space-y-1`}>
              {item.children?.map((child, i) => (
                <AccordionItem key={i} item={child} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

export default function Sidebar() {
  const { data: session } = useSession()
  const role = session?.user?.role as TimeGateRole | undefined
  const navSections = getNavSectionsForRole(role)

  return (
    <div
      id="hs-application-sidebar"
      data-tour="sidebar"
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
            aria-label="TimeGate"
          >
            <OrgLogo variant="full" tone="on-dark" className="max-h-12 w-auto" priority />
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-track]:bg-surface-dark dark:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <nav className="hs-accordion-group px-3 w-full flex flex-col flex-wrap" data-hs-accordion-always-open>
            <ul className="flex flex-col space-y-1 mb-4">
              {navSections.map((section, si) => (
                <span key={si}>
                  <li className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500 py-3">
                    {section.title}
                  </li>
                  {section.items.map((item, ii) => (
                    <AccordionItem key={ii} item={item} depth={0} />
                  ))}
                </span>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mx-3 mt-auto mb-3 shrink-0">
          <SidebarPlanWidget />
        </div>
      </div>
    </div>
  )
}
