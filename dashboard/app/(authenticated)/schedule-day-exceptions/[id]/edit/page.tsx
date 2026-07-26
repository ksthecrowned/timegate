'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import ScheduleDayExceptionForm from '@/components/timegate/ScheduleDayExceptionForm'
import {
  getScheduleDayException,
  updateScheduleDayException,
} from '@/lib/timegate/schedule-day-exceptions'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner } from '@/components/timegate/ui'

export default function EditScheduleDayExceptionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<{
    shiftTypeId: string
    workDate: string
    isOff: boolean
    startTime?: string
    endTime?: string
    note?: string
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void getScheduleDayException(id)
      .then((row) => {
        setInitial({
          shiftTypeId: row.shiftTypeId,
          workDate: row.workDate,
          isOff: row.isOff,
          startTime: row.startTime ?? '08:00',
          endTime: row.endTime ?? '12:00',
          note: row.note ?? '',
        })
      })
      .catch((err) => {
        setError(err instanceof HttpError ? err.message : 'Chargement impossible')
      })
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Exceptions de journée', href: '/schedule-day-exceptions' },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {initial ? (
        <ScheduleDayExceptionForm
          initial={initial}
          lockShiftType
          submitLabel="Enregistrer"
          onCancel={() => router.push('/schedule-day-exceptions')}
          onSubmit={async (values) => {
            await updateScheduleDayException(id, values)
            router.push('/schedule-day-exceptions')
          }}
        />
      ) : !error ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : null}
    </div>
  )
}
