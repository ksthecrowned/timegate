'use client'

import ManagerInboxView from '@/components/manager/ManagerInboxView'
import { Suspense } from 'react'

export default function ManagerInboxPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
      <ManagerInboxView />
    </Suspense>
  )
}
