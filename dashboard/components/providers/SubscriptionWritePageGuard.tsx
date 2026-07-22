'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Bloque les pages /new et /edit en lecture seule (accès direct URL). */
export default function SubscriptionWritePageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { canWrite, loading } = useSubscriptionAccess()

  const isWritePath =
    /\/new(?:\/|$)/.test(pathname) || /\/edit(?:\/|$)/.test(pathname)

  if (!isWritePath || loading || canWrite) {
    return <>{children}</>
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-semibold">Lecture seule</p>
      <p className="mt-1 opacity-90">
        Votre abonnement est en période de grâce. Activez une clé pour créer ou modifier des
        données.
      </p>
      <Link
        href="/activate"
        className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
      >
        Activer une clé
      </Link>
    </div>
  )
}
