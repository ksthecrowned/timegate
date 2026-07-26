'use client'

import ShiftSwapForm from '@/components/timegate/ShiftSwapForm'
import PageHeader from '@/components/ui/PageHeader'
import { createShiftSwap } from '@/lib/timegate/shift-swaps'
import { useRouter } from 'next/navigation'

export default function NewShiftSwapPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Échanges de shifts', href: '/shift-swaps' },
          { label: 'Nouvelle demande' },
        ]}
      />
      <ShiftSwapForm
        submitLabel="Créer la demande"
        onCancel={() => router.push('/shift-swaps')}
        onSubmit={async (values) => {
          await createShiftSwap(values)
          router.push('/shift-swaps')
        }}
      />
    </div>
  )
}
