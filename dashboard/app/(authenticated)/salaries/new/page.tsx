'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import SalaryForm from '@/components/timegate/SalaryForm'
import { createSalary } from '@/lib/timegate/salaries'

export default function NewSalaryPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Salaires', href: '/salaries' }, { label: 'Ajouter' }]}
      />
      <SalaryForm
        submitLabel="Créer"
        onCancel={() => router.push('/salaries')}
        onSubmit={async (values) => {
          await createSalary(values)
          router.push('/salaries')
        }}
      />
    </div>
  )
}
