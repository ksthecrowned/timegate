'use client'

import InboxApprovalsPanel from '@/components/manager/InboxApprovalsPanel'
import InboxMessagesPanel from '@/components/manager/InboxMessagesPanel'
import { secondaryBtnClass } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

type InboxView = 'approvals' | 'messages'

const VIEWS: Array<{ key: InboxView; label: string; icon: string }> = [
  { key: 'approvals', label: 'À traiter', icon: 'fa-inbox' },
  { key: 'messages', label: 'Messagerie', icon: 'fa-comments' },
]

function parseView(raw: string | null): InboxView {
  return raw === 'messages' ? 'messages' : 'approvals'
}

export default function ManagerInboxView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = useMemo(() => parseView(searchParams.get('view')), [searchParams])

  const setView = useCallback(
    (next: InboxView) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'approvals') {
        params.delete('view')
        params.delete('c')
      } else {
        params.set('view', next)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div data-tour="manager-inbox">
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/' },
          { label: 'À traiter & messages' },
        ]}
        action={
          <Link href="/manager/team" className={secondaryBtnClass}>
            <i className="fa-solid fa-users" />
            Équipe du jour
          </Link>
        }
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Validations (pointages, temps travaillé, congés, claims) et messagerie. Les alertes
        in-app sont la cloche en haut à droite.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
        <div className="border-b border-slate-200/80 dark:border-border-dark">
          <nav className="flex gap-0 px-1" role="tablist" aria-label="Sections inbox">
            {VIEWS.map((v) => {
              const active = view === v.key
              return (
                <button
                  key={v.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(v.key)}
                  className={`relative inline-flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
                  }`}
                >
                  <i className={`fa-solid ${v.icon} text-xs opacity-70`} aria-hidden />
                  {v.label}
                </button>
              )
            })}
          </nav>
        </div>

        {view === 'approvals' ? <InboxApprovalsPanel /> : <InboxMessagesPanel />}
      </div>
    </div>
  )
}
