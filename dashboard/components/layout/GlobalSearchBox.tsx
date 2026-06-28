'use client'

import { globalSearch, type GlobalSearchResult } from '@/lib/timegate/search'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const sectionLabels: Record<keyof GlobalSearchResult['results'], string> = {
  employees: 'Employés',
  branches: 'Branches',
  departments: 'Départements',
  designations: 'Postes',
  kiosks: 'Kiosques',
}

export default function GlobalSearchBox() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<GlobalSearchResult | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setData(null)
      setOpen(false)
      return
    }
    timer.current = setTimeout(() => {
      setLoading(true)
      void globalSearch(trimmed, 5)
        .then((res) => {
          setData(res)
          setOpen(true)
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false))
    }, 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [q])

  const hasResults =
    data &&
    Object.values(data.results).some((section) => section.length > 0)

  return (
    <div className="relative hidden md:block w-full max-w-md">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Recherche globale…"
        className="ps-9 py-2 px-3 block w-full border border-slate-200/80 shadow-xs rounded-lg text-sm text-slate-800 focus:border-primary focus:ring-primary disabled:opacity-50 dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500"
      />
      <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none ps-3">
        <svg className="size-4 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      </div>
      {open && (loading || hasResults) ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {loading ? <p className="text-sm text-gray-500">Recherche…</p> : null}
          {!loading && data
            ? (Object.keys(sectionLabels) as Array<keyof GlobalSearchResult['results']>).map((key) => {
                const items = data.results[key]
                if (!items.length) return null
                return (
                  <div key={key} className="mb-3 last:mb-0">
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-1">
                      {sectionLabels[key]}
                    </p>
                    <ul className="space-y-1">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className="block rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800"
                          >
                            <span className="font-medium">{item.label}</span>
                            {item.meta ? (
                              <span className="block text-xs text-gray-500 truncate">{item.meta}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            : null}
          {!loading && data && !hasResults ? (
            <p className="text-sm text-gray-500">Aucun résultat.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
