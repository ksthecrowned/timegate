'use client'

import { useState } from 'react'
import { FormField, DateField } from '@/components/ui/FormField'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import { lastNDaysRange } from '@/lib/timegate/period-range'
import { parseApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

type PeriodRecalculateButtonProps = {
  label?: string
  defaultDays?: number
  onRecalculate: (range: { from: string; to: string }) => Promise<{ message: string }>
}

export default function PeriodRecalculateButton({
  label = 'Recalculer',
  defaultDays = 30,
  onRecalculate,
}: PeriodRecalculateButtonProps) {
  const defaults = lastNDaysRange(defaultDays)
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleRecalculate() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await onRecalculate({ from, to })
      setSuccess(res.message)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Recalcul impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Du">
          <DateField value={from} onChange={setFrom} />
        </FormField>
        <FormField label="Au">
          <DateField value={to} onChange={setTo} minDate={parseApiDate(from) ?? undefined} />
        </FormField>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRecalculate()}
          className={primaryBtnClass}
        >
          {loading ? 'Recalcul…' : label}
        </button>
      </div>
      <ApiErrorBanner message={error} />
      {success && (
        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {success}
        </div>
      )}
    </div>
  )
}
