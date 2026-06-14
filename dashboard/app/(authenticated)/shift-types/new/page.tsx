'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ShiftTypeForm from '@/components/timegate/ShiftTypeForm'
import { createShiftType } from '@/lib/timegate/shift-types'

export default function NewShiftTypePage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Horaires', href: '/shift-types' },
          { label: 'Ajouter' },
        ]}
      />
      <ShiftTypeForm
        submitLabel="Créer"
        onCancel={() => router.push('/shift-types')}
        onSubmit={async (values) => {
          const row = await createShiftType(values)
          router.push(`/shift-types/${row.id}`)
        }}
      />
    </div>
  )
}
