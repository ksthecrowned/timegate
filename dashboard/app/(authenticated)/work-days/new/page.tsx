'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import WorkDayForm from '@/components/timegate/WorkDayForm'
import { createWorkDay } from '@/lib/timegate/work-days'

export default function NewWorkDayPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Jours ouvrés', href: '/work-days' }, { label: 'Ajouter' }]}
      />
      <WorkDayForm
        submitLabel="Créer"
        onCancel={() => router.push('/work-days')}
        onSubmit={async (values) => {
          await createWorkDay(values)
          router.push('/work-days')
        }}
      />
    </div>
  )
}
