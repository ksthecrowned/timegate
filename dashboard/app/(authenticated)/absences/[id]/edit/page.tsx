'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import AbsenceForm from '@/components/timegate/AbsenceForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getAbsence, updateAbsence } from '@/lib/timegate/absences'
import type { Absence } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function EditAbsencePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<Absence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getAbsence(params.id)
      .then((found) => {
        if (!found) setError('Absence introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Absences', href: '/absences' },
          { label: row ? formatApiDate(row.date) : 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <AbsenceForm
          submitLabel="Enregistrer"
          initial={{
            employeeId: row.employeeId,
            date: row.date,
            justified: row.justified,
            reason: row.reason ?? '',
            justificationFileUrl: row.justificationFileUrl ?? '',
          }}
          onCancel={() => router.push('/absences')}
          onSubmit={async (values) => {
            await updateAbsence(params.id, values)
            router.push('/absences')
          }}
        />
      ) : null}
    </div>
  )
}
