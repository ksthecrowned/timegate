'use client'

import { useTour } from '@/components/tour/TourProvider'
import { loadTourState } from '@/lib/tour'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

function waitForHomeReady(timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector('[data-tour="home-today"]')) {
      resolve()
      return
    }
    const started = Date.now()
    const timer = window.setInterval(() => {
      if (
        document.querySelector('[data-tour="home-today"]') ||
        Date.now() - started >= timeoutMs
      ) {
        window.clearInterval(timer)
        resolve()
      }
    }, 200)
  })
}

/**
 * Auto-starts the product tour once on the home dashboard for first-time users.
 * Does not auto-start when a running tour should resume (handled by TourResumeModal).
 */
export default function ProductTourBootstrap() {
  const pathname = usePathname()
  const { userId, role, startTour } = useTour()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    if (pathname !== '/') return
    if (!userId || !role) return

    const state = loadTourState(userId, role)
    if (state?.status === 'completed' || state?.status === 'dismissed') return
    if (state?.status === 'running') return

    started.current = true
    let cancelled = false

    void (async () => {
      await waitForHomeReady()
      if (cancelled) return
      await new Promise((r) => window.setTimeout(r, 250))
      if (!cancelled) await startTour()
    })()

    return () => {
      cancelled = true
    }
  }, [pathname, userId, role, startTour])

  return null
}
