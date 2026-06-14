'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import AbsenceForm from '@/components/timegate/AbsenceForm'
import { createAbsence } from '@/lib/timegate/absences'

export default function NewAbsencePage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Absences', href: '/absences' }, { label: 'Ajouter' }]}
      />
      <AbsenceForm
        submitLabel="Créer"
        onCancel={() => router.push('/absences')}
        onSubmit={async (values) => {
          await createAbsence(values)
          router.push('/absences')
        }}
      />
    </div>
  )
}
