'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import HolidayCalendar from '@/components/timegate/HolidayCalendar'
import { ApiErrorBanner } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { deleteHoliday, listHolidaysForYear } from '@/lib/timegate/holidays'
import type { Holiday } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

export default function HolidaysPage() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [data, setData] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (targetYear: number) => {
    setLoading(true)
    setError('')
    try {
      setData((await listHolidaysForYear(targetYear)).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(year)
  }, [year, load])

  async function handleDelete(holiday: Holiday) {
    try {
      await deleteHoliday(holiday.id)
      await load(year)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Suppression impossible')
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Temps' }, { label: 'Jours fériés' }]}
        action={<AddPageLink href="/holidays/new" label="Ajouter un jour férié" />}
      />

      <ApiErrorBanner message={error} />

      <HolidayCalendar
        year={year}
        holidays={data}
        loading={loading}
        onYearChange={setYear}
        onDelete={(holiday) => void handleDelete(holiday)}
      />
    </div>
  )
}
