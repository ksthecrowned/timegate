'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LeaveForm from '@/components/timegate/LeaveForm'
import { createLeave } from '@/lib/timegate/leaves'

export default function NewLeavePage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Congés', href: '/leaves' }, { label: 'Ajouter' }]}
      />
      <LeaveForm
        submitLabel="Créer"
        onCancel={() => router.push('/leaves')}
        onSubmit={async (values) => {
          await createLeave(values)
          router.push('/leaves')
        }}
      />
    </div>
  )
}
