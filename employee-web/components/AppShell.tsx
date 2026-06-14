'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { getStoredProfile, isAuthenticated, logoutEmployee } from '@/lib/auth'

const tabs = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/checkins', label: 'Pointages', icon: '⏱️' },
  { href: '/leaves', label: 'Congés', icon: '🏖️' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const profile = getStoredProfile()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-bg-top/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">TimeGate</p>
            <p className="truncate text-sm font-semibold">
              {profile ? `${profile.firstName} ${profile.lastName}` : 'Mon espace'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logoutEmployee()
              router.replace('/login')
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-muted hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-white/10 bg-bg-bottom/95 px-2 py-2 backdrop-blur-md">
        <ul className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`flex flex-col items-center rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                    active ? 'bg-white/10 text-accent' : 'text-text-muted hover:text-white'
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {tab.icon}
                  </span>
                  <span className="mt-1">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
