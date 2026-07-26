'use client'

import { hasCompletedProductTour, startProductTour } from '@/lib/product-tour'
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
 */
export default function ProductTourBootstrap() {
  const pathname = usePathname()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    if (pathname !== '/') return
    if (hasCompletedProductTour()) return

    started.current = true
    let cancelled = false

    void (async () => {
      await waitForHomeReady()
      if (cancelled) return
      // Let layout settle after data paint
      await new Promise((r) => window.setTimeout(r, 250))
      if (!cancelled) startProductTour()
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
