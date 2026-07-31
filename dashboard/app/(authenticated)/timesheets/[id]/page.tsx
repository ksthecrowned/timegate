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
  parseTimesheetAnomalyFlags,
  timesheetStatusReason,
} from '@/lib/timegate/timesheets'
import type { TimesheetDay, TimesheetOverride } from '@/lib/timegate/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { STATUS_OPTIONS } from '@/constants'

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
    <div className="space-y-4" data-tour="timesheet-detail">
      <PageHeader
        breadcrumbs={[
          { label: 'Présence', href: '/timesheets' },
          { label: 'Temps travaillé', href: '/timesheets' },
          { label: row ? formatApiDate(row.date) : 'Détail' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {success ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400">
          {success}
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-6">
          <SkeletonDetailCard rows={7} />
          <SkeletonFormCard fields={3} />
        </div>
      ) : row ? (
        <div className="space-y-6">
          {parseTimesheetAnomalyFlags(row.anomalyFlags).includes('UNCLOSED_CHECKIN') ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="font-semibold">Sortie manquante</p>
              <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
                Les heures affichées peuvent être estimées. Validez ou corrigez ci-dessous puis
                enregistrez — la journée passera en statut fermé.
              </p>
            </div>
          ) : null}

          <DetailCard title={`Feuille de temps — ${formatApiDate(row.date)}`}>
            <DetailRow label="Employé" value={employeeLabel(row.employee)} />
            <DetailRow label="Date" value={formatApiDate(row.date)} />
            <DetailRow label="Temps travaillé" value={formatMinutes(row.workedMinutes)} />
            <DetailRow label="Pause" value={formatMinutes(row.breakMinutes)} />
            <DetailRow label="Retard" value={formatMinutes(row.lateMinutes)} />
            <DetailRow label="Heures sup." value={formatMinutes(row.overtimeMinutes)} />
            <DetailRow
              label="Statut"
              value={
                <StatusBadge
                  status={findOption(STATUS_OPTIONS, row.status)?.label ?? row.status}
                />
              }
            />
            {row.status !== 'CLOSED' ? (
              <DetailRow label="Motif" value={timesheetStatusReason(row)} />
            ) : null}
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
            <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
              Historique des corrections
            </h3>
            <RecordCardList
              items={overrides}
              emptyMessage="Aucune correction enregistrée."
              keyFn={(item) => item.id}
              renderItem={(item) => (
                <RecordCard title={formatApiDateTime(item.createdAt)}>
                  <RecordCardField label="Motif" value={item.reason} />
                  <RecordCardField label="Gestionnaire" value={item.manager?.email ?? '—'} />
                </RecordCard>
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
