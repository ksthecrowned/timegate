'use client'

import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import ScheduleDayExceptionForm from '@/components/timegate/ScheduleDayExceptionForm'
import ActionButtons from '@/components/ui/ActionButtons'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import {
  createScheduleDayException,
  deleteScheduleDayException,
  listScheduleDayExceptions,
  type ScheduleDayException,
  updateScheduleDayException,
} from '@/lib/timegate/schedule-day-exceptions'
import { deleteShiftType, getShiftType } from '@/lib/timegate/shift-types'
import type { ShiftType, WorkDay } from '@/lib/timegate/types'
import { WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

function formatTime(value: string): string {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

export default function ShiftTypeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<ShiftType | null>(null)
  const [exceptions, setExceptions] = useState<ScheduleDayException[]>([])
  const [loading, setLoading] = useState(true)
  const [exceptionsLoading, setExceptionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [exceptionError, setExceptionError] = useState('')
  const [editingException, setEditingException] = useState<ScheduleDayException | null>(null)
  const [showCreateException, setShowCreateException] = useState(false)

  const loadExceptions = useCallback(async () => {
    setExceptionsLoading(true)
    setExceptionError('')
    try {
      const res = await listScheduleDayExceptions({ page: 1, limit: 100, shiftTypeId: id })
      setExceptions(res.data)
    } catch (err) {
      setExceptionError(err instanceof HttpError ? err.message : 'Impossible de charger les exceptions.')
    } finally {
      setExceptionsLoading(false)
    }
  }, [id])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [shiftType] = await Promise.all([getShiftType(id), loadExceptions()])
      setRow(shiftType)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Horaire introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id, loadExceptions])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Horaires', href: '/shift-types' },
          { label: row?.name ?? 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/shift-types/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteShiftType(id).then(() => router.push('/shift-types'))
                }}
              />
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <DetailCard title={row.name}>
          <DetailRow label="Branche" value={row.branch?.name ?? '—'} />
          <DetailRow
            label="Horaires"
            value={`${formatTime(row.startTime)} — ${formatTime(row.endTime)}`}
          />
          <DetailRow label="Tolérance retard (min)" value={row.lateGraceMinutes ?? '—'} />
          <DetailRow
            label="Fenêtre arrivée"
            value={
              row.checkInWindowStart && row.checkInWindowEnd
                ? `${formatTime(row.checkInWindowStart)} — ${formatTime(row.checkInWindowEnd)}`
                : 'Défaut (dérivé du service)'
            }
          />
          <DetailRow
            label="Fenêtre départ"
            value={
              row.checkOutWindowStart && row.checkOutWindowEnd
                ? `${formatTime(row.checkOutWindowStart)} — ${formatTime(row.checkOutWindowEnd)}`
                : 'Défaut (fin de service → minuit)'
            }
          />
          <DetailRow
            label="Plage pause"
            value={
              row.breakWindowStart && row.breakWindowEnd
                ? `${formatTime(row.breakWindowStart)} — ${formatTime(row.breakWindowEnd)} (${row.breakDurationMinutes ?? 60} min)`
                : 'Défaut'
            }
          />
          <DetailRow
            label="Créé le"
            value={new Date(row.createdAt).toLocaleString('fr-FR')}
          />
        </DetailCard>
      ) : null}
      {row?.weekDays && row.weekDays.length > 0 ? (
        <DetailCard title="Jours travaillés">
          {row.weekDays.map((wd: WorkDay) => (
            <DetailRow
              key={wd.id}
              label={WEEK_DAY_LABELS[wd.day] ?? wd.day}
              value={`${formatTime(wd.startTime)} — ${formatTime(wd.endTime)}`}
            />
          ))}
        </DetailCard>
      ) : row ? (
        <DetailCard title="Jours travaillés">
          <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Aucun jour configuré — cet horaire ne planifie personne. Modifiez l&apos;horaire pour
            cocher les jours.
          </p>
        </DetailCard>
      ) : null}
      {row ? (
        <DetailCard
          title="Exceptions de journée"
          actions={
            <button
              type="button"
              className={primaryBtnClass}
              onClick={() => {
                setEditingException(null)
                setShowCreateException((prev) => !prev)
              }}
            >
              {showCreateException ? 'Fermer' : 'Ajouter une exception'}
            </button>
          }
        >
          <ApiErrorBanner message={exceptionError} />
          <p className="px-4 pb-2 text-sm text-slate-500 dark:text-slate-400">
            Géré directement sur cet horaire : pas de page dédiée.
          </p>

          {showCreateException ? (
            <div className="px-4 pb-4">
              <ScheduleDayExceptionForm
                initial={{ shiftTypeId: row.id, isOff: false }}
                lockShiftType
                submitLabel="Créer"
                onCancel={() => setShowCreateException(false)}
                onSubmit={async (values) => {
                  await createScheduleDayException(values)
                  setShowCreateException(false)
                  await loadExceptions()
                }}
              />
            </div>
          ) : null}

          {exceptionsLoading ? (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
          ) : exceptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Aucune exception configurée pour cet horaire.
            </p>
          ) : (
            <div className="overflow-x-auto px-4 pb-4">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Horaires</th>
                    <th className="py-2 pr-3 font-semibold">Note</th>
                    <th className="py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">
                        {new Date(item.workDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-2 pr-3">{item.isOff ? 'Non travaillé' : 'Horaires modifiés'}</td>
                      <td className="py-2 pr-3">
                        {item.isOff ? '—' : `${item.startTime ?? '—'} — ${item.endTime ?? '—'}`}
                      </td>
                      <td className="py-2 pr-3">{item.note ?? '—'}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                              setShowCreateException(false)
                              setEditingException(item)
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:underline dark:text-red-400"
                            onClick={() => {
                              void deleteScheduleDayException(item.id).then(loadExceptions)
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingException ? (
            <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
              <ScheduleDayExceptionForm
                initial={{
                  shiftTypeId: row.id,
                  workDate: editingException.workDate.slice(0, 10),
                  isOff: editingException.isOff,
                  startTime: editingException.startTime ?? '08:00',
                  endTime: editingException.endTime ?? '12:00',
                  note: editingException.note ?? '',
                }}
                lockShiftType
                submitLabel="Enregistrer"
                onCancel={() => setEditingException(null)}
                onSubmit={async (values) => {
                  await updateScheduleDayException(editingException.id, values)
                  setEditingException(null)
                  await loadExceptions()
                }}
              />
            </div>
          ) : null}
        </DetailCard>
      ) : null}
    </div>
  )
}
