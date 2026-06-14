'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import EmployeeForm from '@/components/timegate/EmployeeForm'
import { createEmployee } from '@/lib/timegate/employees'
import { primaryBtnClass } from '@/components/timegate/ui'

export default function NewEmployeePage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Employés', href: '/employees' }, { label: 'Ajouter' }]}
        action={
          <Link href="/employees" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <EmployeeForm
        submitLabel="Créer l’employé"
        onCancel={() => router.push('/employees')}
        onSubmit={async (values) => {
          const employee = await createEmployee(values)
          router.push(`/employees/${employee.id}`)
        }}
      />
    </div>
  )
}
