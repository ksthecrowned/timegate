'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LateRecordForm from '@/components/timegate/LateRecordForm'
import { createLateRecord } from '@/lib/timegate/late-records'

export default function NewLateRecordPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Retards', href: '/late-records' }, { label: 'Ajouter' }]}
      />
      <LateRecordForm
        submitLabel="Créer"
        onCancel={() => router.push('/late-records')}
        onSubmit={async (values) => {
          await createLateRecord(values)
          router.push('/late-records')
        }}
      />
    </div>
  )
}
