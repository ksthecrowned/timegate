"use client"
import CopilotPanel from '@/components/ai/CopilotPanel'
import { CopilotProvider } from '@/components/ai/CopilotProvider'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import WebPushSetup from '@/components/layout/WebPushSetup'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { OrganizationProvider } from '@/components/providers/OrganizationProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useEffect(() => {
    // Réinitialise Preline à chaque changement de page
    if (typeof window !== 'undefined' && (window as any).HSStaticMethods) {
      (window as any).HSStaticMethods.autoInit()
    }
  }, [pathname])
  return (
    <AuthProvider>
      <OrganizationProvider>
      <ToastProvider>
        <CopilotProvider>
        <WebPushSetup />
        <div className="w-full min-h-screen bg-surface text-slate-900 dark:bg-surface-dark dark:text-slate-100">
          <Sidebar />
          <Navbar />
          {/* <SubscriptionBanner /> */}
          <CopilotPanel />
          <main className="w-full lg:ps-[260px] mt-16">
            <div className="p-4 sm:p-6 space-y-6 page-enter">
              {children}
            </div>
          </main>
        </div>
        </CopilotProvider>
      </ToastProvider>
      </OrganizationProvider>
    </AuthProvider>
  )
}
