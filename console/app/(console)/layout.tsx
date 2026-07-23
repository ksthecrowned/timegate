'use client'

import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods) {
      ;(window as unknown as { HSStaticMethods: { autoInit: () => void } }).HSStaticMethods.autoInit()
    }
  }, [pathname])

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="w-full min-h-screen bg-surface text-slate-900 dark:bg-surface-dark dark:text-slate-100">
          <Sidebar />
          <Navbar />
          <main className="w-full lg:ps-65 mt-16">
            <div className="px-4 py-6 sm:py-4 space-y-6 page-enter">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  )
}
