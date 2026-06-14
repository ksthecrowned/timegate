'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LeaveTypeForm from '@/components/timegate/LeaveTypeForm'
import { createLeaveType } from '@/lib/timegate/leave-types'

export default function NewLeaveTypePage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Types de congé', href: '/leave-types' },
          { label: 'Ajouter' },
        ]}
      />
      <LeaveTypeForm
        submitLabel="Créer"
        onCancel={() => router.push('/leave-types')}
        onSubmit={async (values) => {
          const row = await createLeaveType(values)
          router.push(`/leave-types/${row.id}`)
        }}
      />
    </div>
  )
}
