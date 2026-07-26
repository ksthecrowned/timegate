'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ScheduleDayExceptionForm from '@/components/timegate/ScheduleDayExceptionForm'
import { createScheduleDayException } from '@/lib/timegate/schedule-day-exceptions'

export default function NewScheduleDayExceptionPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Exceptions de journée', href: '/schedule-day-exceptions' },
          { label: 'Ajouter' },
        ]}
      />
      <ScheduleDayExceptionForm
        submitLabel="Créer"
        onCancel={() => router.push('/schedule-day-exceptions')}
        onSubmit={async (values) => {
          await createScheduleDayException(values)
          router.push('/schedule-day-exceptions')
        }}
      />
    </div>
  )
}
