'use client'

import { useTour } from '@/components/tour/TourProvider'

export default function TourProgressChip() {
  const { progress, stopTour } = useTour()
  if (!progress.running || !progress.label) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000000001] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200/80 bg-surface-card px-4 py-2.5 shadow-lg dark:border-border-dark dark:bg-surface-card-dark">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {progress.label}
        </span>
        <button
          type="button"
          onClick={() => stopTour('dismissed')}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Quitter
        </button>
      </div>
    </div>
  )
}
