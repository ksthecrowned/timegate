'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import { HintTooltip } from '@/components/ui/HintTooltip'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listShiftTypes } from '@/lib/timegate/shift-types'
import {
  getTenantAttendanceSettings,
  updateTenantAttendanceSettings,
} from '@/lib/timegate/tenant-settings'
import type { SelectOption } from '@/components/ui/select-search-types'

export default function TenantAttendanceSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shiftOptions, setShiftOptions] = useState<SelectOption[]>([])
  const [defaultShiftTypeId, setDefaultShiftTypeId] = useState('')
  const [pinFailureThreshold, setPinFailureThreshold] = useState(3)
  const [pinFailureCooldownSeconds, setPinFailureCooldownSeconds] = useState(30)
  const [timesheetRoundingMinutes, setTimesheetRoundingMinutes] = useState(0)
  const [overtimeAlertThresholdMinutes, setOvertimeAlertThresholdMinutes] = useState(120)
  const [minMinutesBetweenShifts, setMinMinutesBetweenShifts] = useState(660)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [settings, shifts] = await Promise.all([
        getTenantAttendanceSettings(),
        listShiftTypes({ page: 1, limit: 100 }),
      ])
      setShiftOptions(toSelectOptions(shifts.data))
      setDefaultShiftTypeId(settings.defaultShiftTypeId ?? '')
      setPinFailureThreshold(settings.pinFailureThreshold ?? 3)
      setPinFailureCooldownSeconds(settings.pinFailureCooldownSeconds ?? 30)
      setTimesheetRoundingMinutes(settings.timesheetRoundingMinutes ?? 0)
      setOvertimeAlertThresholdMinutes(settings.overtimeAlertThresholdMinutes ?? 120)
      setMinMinutesBetweenShifts(settings.minMinutesBetweenShifts ?? 660)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTenantAttendanceSettings({
        defaultShiftTypeId: defaultShiftTypeId.trim() || null,
        pinFailureThreshold,
        pinFailureCooldownSeconds,
        timesheetRoundingMinutes,
        overtimeAlertThresholdMinutes,
        minMinutesBetweenShifts,
      })
      setSuccess('Paramètres enregistrés.')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration organisation', href: '/organization' },
          { label: 'Paramètres pointage' },
        ]}
      />

      {error ? <ApiErrorBanner message={error} /> : null}
      {success ? (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          {success}
        </div>
      ) : null}

      {loading ? (
        <SkeletonDetailCard />
      ) : (
        <form onSubmit={handleSave}>
          <FormCard
            title="Paramètres pointage"
            hint="Ces réglages s'appliquent à tous les kiosques de votre organisation. Les méthodes (visage, NFC, QR) se configurent par kiosque."
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
              <FormField
                label="Horaire fallback"
                hint="Utilisé pour les fenêtres de pointage si l'employé n'a ni affectation du jour ni horaire par défaut."
              >
                <SelectSearch
                  instanceId="tenant-default-shift"
                  options={shiftOptions}
                  value={findOption(shiftOptions, defaultShiftTypeId)}
                  isClearable
                  onChange={(opt) => setDefaultShiftTypeId(opt?.value ?? '')}
                  placeholder="Aucun — employé sans horaire assigné"
                />
              </FormField>

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Fallback PIN (kiosque)
                  <HintTooltip text="Après le seuil d'échecs sur visage ou NFC, le kiosque propose le PIN puis impose ce délai avant de réessayer le mode principal." />
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Échecs avant bascule PIN">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={pinFailureThreshold}
                      onChange={(e) =>
                        setPinFailureThreshold(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </FormField>
                  <FormField label="Délai de blocage (secondes)">
                    <Input
                      type="number"
                      min={0}
                      max={600}
                      value={pinFailureCooldownSeconds}
                      onChange={(e) =>
                        setPinFailureCooldownSeconds(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </FormField>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Politique timesheet
                  <HintTooltip text="Appliquée lors du recalcul des journées. Les retards utilisent aussi le seuil tenant (page Reconnaissance & retards) ou la tolérance de l'horaire type." />
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Arrondi (minutes)" hint="0 = aucun, 5 ou 15 min au plus proche.">
                    <SelectSearch
                      instanceId="tenant-rounding"
                      options={[
                        { value: '0', label: 'Aucun' },
                        { value: '5', label: '5 minutes' },
                        { value: '15', label: '15 minutes' },
                      ]}
                      value={
                        [
                          { value: '0', label: 'Aucun' },
                          { value: '5', label: '5 minutes' },
                          { value: '15', label: '15 minutes' },
                        ].find((o) => o.value === String(timesheetRoundingMinutes)) ?? null
                      }
                      onChange={(opt) =>
                        setTimesheetRoundingMinutes(Number(opt?.value ?? 0))
                      }
                    />
                  </FormField>
                  <FormField label="Alerte HS (min)" hint="Notification si HS ≥ seuil sur une journée clôturée.">
                    <Input
                      type="number"
                      min={0}
                      max={480}
                      value={overtimeAlertThresholdMinutes}
                      onChange={(e) =>
                        setOvertimeAlertThresholdMinutes(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </FormField>
                  <FormField label="Repos min. entre shifts (min)" hint="Ex. 660 = 11 h entre deux journées.">
                    <Input
                      type="number"
                      min={0}
                      max={1440}
                      value={minMinutesBetweenShifts}
                      onChange={(e) =>
                        setMinMinutesBetweenShifts(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  )
}
