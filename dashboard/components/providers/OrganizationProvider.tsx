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
import { getMyCompany, type CompanyProfile } from '@/lib/timegate/company'

type OrganizationContextValue = {
  company: CompanyProfile | null
  loading: boolean
  reload: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue>({
  company: null,
  loading: false,
  reload: async () => {},
})

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.companyId) {
      setCompany(null)
      return
    }
    setLoading(true)
    try {
      setCompany(await getMyCompany())
    } catch {
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.companyId, status])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo(
    () => ({
      company,
      loading,
      reload,
    }),
    [company, loading, reload],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  return useContext(OrganizationContext)
}
