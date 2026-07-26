'use client'

import { useTour } from '@/components/tour/TourProvider'
import { loadTourState, saveTourState } from '@/lib/tour'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function OrgSetupReminderBanner() {
  const { userId, role } = useTour()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!userId || !role || role !== 'ADMIN') return
    const state = loadTourState(userId, role)
    if (state?.orgSetupSkipped && !state.orgReminderShown) {
      setShow(true)
    }
  }, [userId, role])

  if (!show || !userId || !role) return null

  function dismiss() {
    const prev = loadTourState(userId!, role!)
    saveTourState(userId!, role!, {
      status: prev?.status ?? 'dismissed',
      stepId: prev?.stepId ?? null,
      orgSetupSkipped: true,
      orgReminderShown: true,
      updatedAt: new Date().toISOString(),
    })
    setShow(false)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/25">
      <p className="text-sm text-sky-900 dark:text-sky-100">
        Finalisez la fiche organisation pour ancrer votre marque dans TimeGate.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900/40"
        >
          Plus tard
        </button>
        <Link
          href="/organization"
          onClick={dismiss}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary"
        >
          Configurer
        </Link>
      </div>
    </div>
  )
}
