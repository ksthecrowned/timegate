"use client"

import CopilotPanel from '@/components/ai/CopilotPanel'
import { CopilotProvider } from '@/components/ai/CopilotProvider'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import SubscriptionBanner from '@/components/layout/SubscriptionBanner'
import WebPushSetup from '@/components/layout/WebPushSetup'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { OrganizationProvider } from '@/components/providers/OrganizationProvider'
import { SubscriptionAccessProvider } from '@/components/providers/SubscriptionAccessProvider'
import SubscriptionWritePageGuard from '@/components/providers/SubscriptionWritePageGuard'
import { ToastProvider } from '@/components/ui/Toast'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).HSStaticMethods) {
      (window as any).HSStaticMethods.autoInit()
    }
  }, [pathname])

  return (
    <AuthProvider>
      <SubscriptionAccessProvider>
        <OrganizationProvider>
          <ToastProvider>
            <CopilotProvider>
              <WebPushSetup />
              <div className="w-full min-h-screen bg-surface text-slate-900 dark:bg-surface-dark dark:text-slate-100">
                <Sidebar />
                <Navbar />
                <CopilotPanel />
                <main className="w-full lg:ps-[260px] mt-16">
                  <SubscriptionBanner />
                  <div className="px-4 py-6 sm:px-6 sm:py-4 space-y-6 page-enter">
                    <SubscriptionWritePageGuard>{children}</SubscriptionWritePageGuard>
                  </div>
                </main>
              </div>
            </CopilotProvider>
          </ToastProvider>
        </OrganizationProvider>
      </SubscriptionAccessProvider>
    </AuthProvider>
  )
}
