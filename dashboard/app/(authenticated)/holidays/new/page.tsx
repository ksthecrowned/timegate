'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import HolidayForm from '@/components/timegate/HolidayForm'
import { createHoliday } from '@/lib/timegate/holidays'

export default function NewHolidayPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Jours fériés', href: '/holidays' }, { label: 'Ajouter' }]}
      />
      <HolidayForm
        submitLabel="Créer"
        onCancel={() => router.push('/holidays')}
        onSubmit={async (values) => {
          await createHoliday(values)
          router.push('/holidays')
        }}
      />
    </div>
  )
}
