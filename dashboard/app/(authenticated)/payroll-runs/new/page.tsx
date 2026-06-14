'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import PayrollRunForm from '@/components/timegate/PayrollRunForm'
import { createPayrollRun } from '@/lib/timegate/payroll-runs'

export default function NewPayrollRunPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Paies', href: '/payroll-runs' }, { label: 'Nouvelle paie' }]}
      />
      <PayrollRunForm
        submitLabel="Créer"
        onCancel={() => router.push('/payroll-runs')}
        onSubmit={async (values) => {
          const row = await createPayrollRun(values)
          router.push(`/payroll-runs/${row.id}`)
        }}
      />
    </div>
  )
}
