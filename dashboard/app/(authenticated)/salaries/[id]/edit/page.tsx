'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import SalaryForm from '@/components/timegate/SalaryForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getSalary, updateSalary } from '@/lib/timegate/salaries'
import type { Salary } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { MONTH_LABELS } from '@/lib/timegate/payroll-runs'

export default function EditSalaryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<Salary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getSalary(params.id)
      .then((found) => {
        if (!found) setError('Salaire introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  const label = row
    ? `${MONTH_LABELS[row.month - 1] ?? row.month} ${row.year}`
    : 'Modifier'

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Salaires', href: '/salaries' }, { label }]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <SalaryForm
          submitLabel="Enregistrer"
          initial={{
            employeeId: row.employeeId,
            year: row.year,
            month: row.month,
            baseSalary: row.baseSalary,
            bonuses: row.bonuses,
            deductions: row.deductions,
            notes: row.notes ?? '',
          }}
          onCancel={() => router.push('/salaries')}
          onSubmit={async (values) => {
            await updateSalary(params.id, values)
            router.push('/salaries')
          }}
        />
      ) : null}
    </div>
  )
}
