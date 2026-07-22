'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import { fetchSubscriptionStatus } from '@/lib/auth/timegate-auth'
import { mapSubscriptionSessionFields } from '@/lib/auth/subscription-session'
import type { SubscriptionStatus } from '@/lib/timegate/types'

type SubscriptionAccessValue = {
  status: SubscriptionStatus | null
  loading: boolean
  /** Mutations autorisées (pas grâce / pas bloqué). */
  canWrite: boolean
  readOnly: boolean
  blocked: boolean
  reload: () => Promise<void>
}

const SubscriptionAccessContext = createContext<SubscriptionAccessValue>({
  status: null,
  loading: true,
  canWrite: true,
  readOnly: false,
  blocked: false,
  reload: async () => {},
})

export function SubscriptionAccessProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession()
  const token = session?.accessToken
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const updateRef = useRef(update)
  updateRef.current = update

  const reload = useCallback(async () => {
    if (!token) {
      setStatus(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const next = await fetchSubscriptionStatus(token)
      setStatus(next)
      const fields = mapSubscriptionSessionFields(next)
      const user = session?.user
      if (
        user &&
        (user.subscriptionReadOnly !== fields.subscriptionReadOnly ||
          user.subscriptionBlocked !== fields.subscriptionBlocked ||
          user.subscriptionStatus !== fields.subscriptionStatus ||
          user.subscriptionActive !== fields.subscriptionActive)
      ) {
        await updateRef.current({ user: { ...user, ...fields } })
      }
    } catch {
      // Garde le dernier statut / fallback session
    } finally {
      setLoading(false)
    }
  }, [token, session?.user])

  useEffect(() => {
    void reload()
    // Intentional: refetch when auth token changes, not on every reload identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const readOnly =
    status?.readOnly ?? Boolean(session?.user?.subscriptionReadOnly)
  const blocked =
    status?.blocked ?? Boolean(session?.user?.subscriptionBlocked)
  const canWrite = !readOnly && !blocked

  const value = useMemo(
    () => ({
      status,
      loading,
      canWrite,
      readOnly,
      blocked,
      reload,
    }),
    [status, loading, canWrite, readOnly, blocked, reload],
  )

  return (
    <SubscriptionAccessContext.Provider value={value}>
      {children}
    </SubscriptionAccessContext.Provider>
  )
}

export function useSubscriptionAccess() {
  return useContext(SubscriptionAccessContext)
}
