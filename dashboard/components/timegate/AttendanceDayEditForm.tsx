'use client'

import { useEffect, useState } from 'react'
import { FormField, SelectSearch } from '@/components/ui/FormField'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { updateAttendanceDay, type UpdateAttendanceDayPayload } from '@/lib/timegate/attendance'
import { listShiftTypes } from '@/lib/timegate/shift-types'
import { listLeaveTypes } from '@/lib/timegate/refs'
import type { AttendanceDay, AttendanceDayStatus } from '@/lib/timegate/types'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'PRESENT', label: 'Présent' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'HALF_DAY', label: 'Demi-journée' },
  { value: 'ON_LEAVE', label: 'En congé' },
  { value: 'ON_HOLIDAY', label: 'Jour férié' },
  { value: 'WORK_FROM_HOME', label: 'Télétravail' },
]

type AttendanceDayEditFormProps = {
  day: AttendanceDay
  onSaved: () => void
}

export default function AttendanceDayEditForm({ day, onSaved }: AttendanceDayEditFormProps) {
  const [form, setForm] = useState<UpdateAttendanceDayPayload>({
    status: day.status,
    shiftId: day.shiftId ?? '',
    leaveTypeId: day.leaveTypeId ?? '',
  })
  const [shiftOptions, setShiftOptions] = useState<SelectOption[]>([])
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const branchId = day.employee?.branchId
    void Promise.all([
      listShiftTypes({ limit: 100, branchId: branchId ?? undefined }),
      listLeaveTypes(),
    ]).then(([shifts, leaveTypes]) => {
      setShiftOptions(toSelectOptions(shifts.data))
      setLeaveTypeOptions(toSelectOptions(leaveTypes.data))
    })
  }, [day.employee?.branchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await updateAttendanceDay(day.id, {
        status: form.status,
        shiftId: form.shiftId || undefined,
        leaveTypeId: form.leaveTypeId || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Correction manuelle"
        footer={
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Statut *">
            <SelectSearch
              required
              options={STATUS_OPTIONS}
              value={findOption(STATUS_OPTIONS, form.status)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  status: (opt?.value as AttendanceDayStatus) ?? f.status,
                }))
              }
            />
          </FormField>
          <FormField label="Horaire">
            <SelectSearch
              options={shiftOptions}
              value={findOption(shiftOptions, form.shiftId ?? '')}
              onChange={(opt) => setForm((f) => ({ ...f, shiftId: opt?.value ?? '' }))}
              isClearable
            />
          </FormField>
          {form.status === 'ON_LEAVE' && (
            <FormField label="Type de congé">
              <SelectSearch
                options={leaveTypeOptions}
                value={findOption(leaveTypeOptions, form.leaveTypeId ?? '')}
                onChange={(opt) => setForm((f) => ({ ...f, leaveTypeId: opt?.value ?? '' }))}
                isClearable
              />
            </FormField>
          )}
        </div>
      </FormCard>
    </form>
  )
}
