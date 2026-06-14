'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import HolidayForm from '@/components/timegate/HolidayForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getHoliday, updateHoliday } from '@/lib/timegate/holidays'
import type { Holiday } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditHolidayPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<Holiday | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getHoliday(params.id)
      .then((found) => {
        if (!found) setError('Jour férié introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Jours fériés', href: '/holidays' },
          { label: row?.name ?? 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <HolidayForm
          submitLabel="Enregistrer"
          initial={{ name: row.name, date: row.date }}
          onCancel={() => router.push('/holidays')}
          onSubmit={async (values) => {
            await updateHoliday(params.id, { name: values.name, date: values.date })
            router.push('/holidays')
          }}
        />
      ) : null}
    </div>
  )
}
