'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { RecordCard, RecordCardField, RecordCardList } from '@/components/ui/RecordCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, Input, Textarea } from '@/components/ui/FormField'
import { employeeLabel } from '@/components/timegate/hooks'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { SkeletonDetailCard, SkeletonFormCard } from '@/components/ui/Skeleton'
import {
  formatMinutes,
  getTimesheet,
  getTimesheetOverrides,
  overrideTimesheet,
} from '@/lib/timegate/timesheets'
import type { TimesheetDay, TimesheetOverride } from '@/lib/timegate/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function TimesheetDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [row, setRow] = useState<TimesheetDay | null>(null)
  const [overrides, setOverrides] = useState<TimesheetOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [workedMinutes, setWorkedMinutes] = useState(0)
  const [lateMinutes, setLateMinutes] = useState(0)
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [overtimeMinutes, setOvertimeMinutes] = useState(0)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [found, overridesRes] = await Promise.all([getTimesheet(id), getTimesheetOverrides(id)])
      setRow(found)
      setWorkedMinutes(found.workedMinutes)
      setLateMinutes(found.lateMinutes)
      setBreakMinutes(found.breakMinutes)
      setOvertimeMinutes(found.overtimeMinutes)
      setOverrides(overridesRes ?? [])
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await overrideTimesheet(id, {
        workedMinutes,
        lateMinutes,
        breakMinutes,
        overtimeMinutes,
        reason: reason.trim(),
      })
      setSuccess('Correction enregistrée.')
      setReason('')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Correction impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Feuilles de temps', href: '/timesheets' },
          { label: row ? formatApiDate(row.date) : 'Détail' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {success && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {success}
        </div>
      )}
      {loading ? (
        <div className="space-y-6">
          <SkeletonDetailCard rows={7} />
          <SkeletonFormCard fields={3} />
        </div>
      ) : row ? (
        <div className="space-y-6">
          <DetailCard title={`Feuille de temps — ${formatApiDate(row.date)}`}>
            <DetailRow label="Employé" value={employeeLabel(row.employee)} />
            <DetailRow label="Date" value={formatApiDate(row.date)} />
            <DetailRow label="Temps travaillé" value={formatMinutes(row.workedMinutes)} />
            <DetailRow label="Pause" value={formatMinutes(row.breakMinutes)} />
            <DetailRow label="Retard" value={formatMinutes(row.lateMinutes)} />
            <DetailRow label="Heures sup." value={formatMinutes(row.overtimeMinutes)} />
            <DetailRow
              label="Statut"
              value={<StatusBadge status={row.status.toLowerCase()} />}
            />
            {row.anomalyFlags && row.anomalyFlags.length > 0 && (
              <DetailRow label="Anomalies" value={row.anomalyFlags.join(', ')} />
            )}
          </DetailCard>

          <form onSubmit={handleOverride}>
            <FormCard
              title="Correction manuelle"
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkedMinutes(row.workedMinutes)
                      setLateMinutes(row.lateMinutes)
                      setBreakMinutes(row.breakMinutes)
                      setOvertimeMinutes(row.overtimeMinutes)
                      setReason('')
                    }}
                    className={secondaryBtnClass}
                  >
                    Réinitialiser
                  </button>
                  <button type="submit" disabled={submitting} className={primaryBtnClass}>
                    {submitting ? 'Enregistrement…' : 'Appliquer la correction'}
                  </button>
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Minutes travaillées">
                  <Input
                    type="number"
                    min={0}
                    value={workedMinutes}
                    onChange={(e) => setWorkedMinutes(Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Minutes de retard">
                  <Input
                    type="number"
                    min={0}
                    value={lateMinutes}
                    onChange={(e) => setLateMinutes(Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Minutes de pause">
                  <Input
                    type="number"
                    min={0}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Minutes heures sup.">
                  <Input
                    type="number"
                    min={0}
                    value={overtimeMinutes}
                    onChange={(e) => setOvertimeMinutes(Number(e.target.value) || 0)}
                  />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Motif *">
                    <Textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Raison de la correction…"
                    />
                  </FormField>
                </div>
              </div>
            </FormCard>
          </form>

          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              Historique des corrections
            </h3>
            <RecordCardList
              items={overrides}
              emptyMessage="Aucune correction enregistrée."
              keyFn={(row) => row.id}
              renderItem={(row) => (
                <RecordCard title={formatApiDateTime(row.createdAt)}>
                  <RecordCardField label="Motif" value={row.reason} />
                  <RecordCardField label="Gestionnaire" value={row.manager?.email ?? '—'} />
                </RecordCard>
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
