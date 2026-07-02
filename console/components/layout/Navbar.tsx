'use client'

import BrandLogo from '@/components/brand/BrandLogo'
import { getRoleLabel } from '@/lib/timegate/roles'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)

  const adminEmail = session?.user?.email ?? 'admin@timegate.com'
  const displayName =
    [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ') ||
    adminEmail.split('@')[0]
  const roleLabel = getRoleLabel(session?.user?.role)

  return (
    <>
      <header className="fixed top-0 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-[6] w-full bg-surface-card/95 backdrop-blur-sm border-b border-slate-200/80 text-sm py-2.5 lg:ps-[260px] dark:bg-surface-card-dark/95 dark:border-border-dark">
        <nav className="px-4 sm:px-6 flex basis-full items-center w-full mx-auto">
          <div className="me-5 lg:me-0 lg:hidden">
            <Link href="/" className="flex items-center" aria-label="TimeGate">
              <BrandLogo variant="icon" tone="on-light" className="h-9 w-9" />
            </Link>
          </div>

          <div className="w-full flex items-center justify-end ms-auto gap-x-2">
            <button
              type="button"
              className="hs-dark-mode hs-dark-mode-active:hidden inline-flex items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm"
              data-hs-theme-click-value="dark"
            >
              <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <button
              type="button"
              className="hs-dark-mode hs-dark-mode-active:inline-flex hidden items-center gap-x-2 py-2 px-3 bg-black/10 dark:bg-white/10 rounded-full text-sm"
              data-hs-theme-click-value="light"
            >
              <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
            </button>

            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="inline-flex items-center gap-x-2 py-1 ps-1 pe-3 bg-black/10 dark:bg-white/10 rounded-full text-sm"
              >
                <img
                  className="size-9 object-cover rounded-full"
                  src="/images/users/avatar-man.jpg"
                  alt="Avatar"
                />
                <span className="font-medium truncate max-w-[7.5rem] hidden sm:block">{displayName}</span>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 min-w-60 tg-card shadow-2xs rounded-lg">
                    <div className="py-3 px-4 border-b border-slate-200/80 dark:border-border-dark">
                      <p className="text-sm text-gray-500 dark:text-neutral-400">{roleLabel}</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-neutral-300">{adminEmail}</p>
                    </div>
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          void signOut({ callbackUrl: '/login' })
                        }}
                        className="w-full flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-red-600 hover:bg-secondary/20"
                      >
                        <i className="fa-solid fa-power-off shrink-0 size-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <div className="-mt-px lg:hidden">
        <div className="fixed top-[61px] inset-x-0 z-20 bg-surface border-y px-4 sm:px-6 border-slate-200/80 dark:bg-surface-card-dark dark:border-border-dark">
          <div className="flex items-center py-2">
            <button
              type="button"
              className="size-8 flex justify-center items-center rounded-lg"
              aria-label="Toggle navigation"
              data-hs-overlay="#hs-application-sidebar"
            >
              <svg className="shrink-0 size-6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6H20M4 12H14M4 18H9" />
              </svg>
            </button>
            <span className="ms-3 text-sm font-semibold text-gray-800 dark:text-neutral-400 truncate">
              Console Plateforme
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
