'use client'

import {
  createTourController,
  getTourStepsForRole,
  type TourController,
  type TourProgress,
  type TourRole,
} from '@/lib/tour'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import 'driver.js/dist/driver.css'

type TourContextValue = {
  startTour: (opts?: { force?: boolean; resumeFromStepId?: string }) => Promise<void>
  stopTour: (reason?: 'completed' | 'dismissed') => void
  progress: TourProgress
  userId: string | null
  role: TourRole | null
  controller: TourController | null
}

const TourContext = createContext<TourContextValue | null>(null)

const EMPTY_PROGRESS: TourProgress = {
  index: 0,
  total: 0,
  label: '',
  step: null,
  running: false,
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id ?? session?.user?.email ?? null
  const rawRole = session?.user?.role
  const role: TourRole | null =
    rawRole === 'ADMIN' || rawRole === 'MANAGER' ? rawRole : null

  const [controller, setController] = useState<TourController | null>(null)
  const [progress, setProgress] = useState<TourProgress>(EMPTY_PROGRESS)

  useEffect(() => {
    if (!userId || !role) {
      setController(null)
      setProgress(EMPTY_PROGRESS)
      return
    }
    const c = createTourController({
      userId,
      role,
      steps: getTourStepsForRole(role),
      router: { push: (href) => router.push(href) },
    })
    setController(c)
    setProgress(c.getProgress())
    return c.subscribe(() => setProgress(c.getProgress()))
  }, [userId, role, router])

  const startTour = useCallback(
    async (opts?: { force?: boolean; resumeFromStepId?: string }) => {
      if (!controller) return
      await controller.start(opts)
      setProgress(controller.getProgress())
    },
    [controller],
  )

  const stopTour = useCallback(
    (reason: 'completed' | 'dismissed' = 'dismissed') => {
      controller?.stop(reason)
      setProgress(controller?.getProgress() ?? EMPTY_PROGRESS)
    },
    [controller],
  )

  const value = useMemo(
    () => ({ startTour, stopTour, progress, userId, role, controller }),
    [startTour, stopTour, progress, userId, role, controller],
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider')
  }
  return ctx
}
