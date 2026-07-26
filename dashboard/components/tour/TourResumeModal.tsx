'use client'

import { useTour } from '@/components/tour/TourProvider'
import { loadTourState } from '@/lib/tour'
import { useEffect, useState } from 'react'

export default function TourResumeModal() {
  const { userId, role, startTour } = useTour()
  const [open, setOpen] = useState(false)
  const [stepId, setStepId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !role) return
    const state = loadTourState(userId, role)
    if (state?.status === 'running' && state.stepId) {
      setStepId(state.stepId)
      setOpen(true)
    }
  }, [userId, role])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000000002] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-surface-card p-6 shadow-xl dark:border-border-dark dark:bg-surface-card-dark">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Reprendre la visite guidée ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Une visite TimeGate était en cours. Vous pouvez reprendre exactement où vous vous étiez
          arrêté, ou recommencer depuis le début.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Plus tard
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:border-primary/40 dark:border-border-dark dark:text-slate-100"
            onClick={() => {
              setOpen(false)
              void startTour({ force: true })
            }}
          >
            Recommencer
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-secondary"
            onClick={() => {
              setOpen(false)
              void startTour({ resumeFromStepId: stepId ?? undefined })
            }}
          >
            Reprendre
          </button>
        </div>
      </div>
    </div>
  )
}
