'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSession } from 'next-auth/react'
import { getAiUsage, type AiUsageSummary } from '@/lib/timegate/copilot'

type CopilotContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  usage: AiUsageSummary | null
  refreshUsage: () => Promise<void>
  canUseCopilot: boolean
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

export function CopilotProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isManager = role === 'ADMIN' || role === 'MANAGER'
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)

  const refreshUsage = useCallback(async () => {
    if (!isManager) return
    try {
      const data = await getAiUsage()
      setUsage(data)
    } catch {
      setUsage({ enabled: false, usedTokens: 0, quotaTokens: null, percent: null, unlimited: false })
    }
  }, [isManager])

  useEffect(() => {
    void refreshUsage()
  }, [refreshUsage])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      usage,
      refreshUsage,
      canUseCopilot: isManager && (usage?.enabled ?? true),
    }),
    [open, usage, refreshUsage, isManager],
  )

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
}

export function useCopilot() {
  const ctx = useContext(CopilotContext)
  if (!ctx) throw new Error('useCopilot must be used within CopilotProvider')
  return ctx
}
