'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import EmployeeForm from '@/components/timegate/EmployeeForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { employeeToFormValues, getEmployee, updateEmployee } from '@/lib/timegate/employees'
import type { Employee } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEmployee(await getEmployee(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Employé introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const fullName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : 'Employé'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Employés', href: '/employees' },
          { label: fullName, href: `/employees/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : employee ? (
        <EmployeeForm
          employeeId={id}
          hasFaceEmbedding={employee.hasFaceEmbedding}
          faceEnrolledAt={employee.faceEnrolledAt}
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/employees/${id}`)}
          initial={employeeToFormValues(employee)}
          onSubmit={async (values) => {
            await updateEmployee(id, values)
            router.push(`/employees/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
