'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ShiftAssignmentForm from '@/components/timegate/ShiftAssignmentForm'
import { createShiftAssignment } from '@/lib/timegate/shift-assignments'

export default function NewShiftAssignmentPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Affectations horaires', href: '/shift-assignments' },
          { label: 'Ajouter' },
        ]}
      />
      <ShiftAssignmentForm
        submitLabel="Créer"
        onCancel={() => router.push('/shift-assignments')}
        onSubmit={async (values) => {
          const row = await createShiftAssignment(values)
          router.push(`/shift-assignments/${row.id}`)
        }}
      />
    </div>
  )
}
