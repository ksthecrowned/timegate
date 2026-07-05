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
  const [defaultFaceEnabled, setDefaultFaceEnabled] = useState(true)
  const [defaultNfcEnabled, setDefaultNfcEnabled] = useState(false)
  const [defaultQrEnabled, setDefaultQrEnabled] = useState(false)
  const [notificationUnclosedReminderDelayMinutes, setNotificationUnclosedReminderDelayMinutes] =
    useState(0)
  const [notificationReviewReminderMinAgeMinutes, setNotificationReviewReminderMinAgeMinutes] =
    useState(24 * 60)
  const [allowOfflineSync, setAllowOfflineSync] = useState(true)
  const [offlineSyncMaxAgeMinutes, setOfflineSyncMaxAgeMinutes] = useState(12 * 60)
  const [faceLogPhotoRetentionDays, setFaceLogPhotoRetentionDays] = useState(30)
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

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
      setDefaultFaceEnabled(settings.defaultFaceEnabled ?? true)
      setDefaultNfcEnabled(settings.defaultNfcEnabled ?? false)
      setDefaultQrEnabled(settings.defaultQrEnabled ?? false)
      setNotificationUnclosedReminderDelayMinutes(
        settings.notificationUnclosedReminderDelayMinutes ?? 0,
      )
      setNotificationReviewReminderMinAgeMinutes(
        settings.notificationReviewReminderMinAgeMinutes ?? 24 * 60,
      )
      setAllowOfflineSync(settings.allowOfflineSync ?? true)
      setOfflineSyncMaxAgeMinutes(settings.offlineSyncMaxAgeMinutes ?? 12 * 60)
      setFaceLogPhotoRetentionDays(settings.faceLogPhotoRetentionDays ?? 30)
      setWebhookEnabled(settings.webhookEnabled ?? false)
      setWebhookUrl(settings.webhookUrl ?? '')
      setWebhookSecret(settings.webhookSecret ?? '')
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
        defaultFaceEnabled,
        defaultNfcEnabled,
        defaultQrEnabled,
        notificationUnclosedReminderDelayMinutes,
        notificationReviewReminderMinAgeMinutes,
        allowOfflineSync,
        offlineSyncMaxAgeMinutes,
        faceLogPhotoRetentionDays,
        webhookEnabled,
        webhookUrl: webhookUrl.trim() || null,
        webhookSecret: webhookSecret.trim() || null,
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
                  Méthodes kiosque par défaut
                  <HintTooltip text="Appliquées automatiquement à la création d’un nouveau kiosque. Modifiables ensuite au cas par cas." />
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Visage (défaut)">
                    <Input
                      type="checkbox"
                      checked={defaultFaceEnabled}
                      onChange={(e) => setDefaultFaceEnabled(e.target.checked)}
                    />
                  </FormField>
                  <FormField label="NFC (défaut)">
                    <Input
                      type="checkbox"
                      checked={defaultNfcEnabled}
                      onChange={(e) => setDefaultNfcEnabled(e.target.checked)}
                    />
                  </FormField>
                  <FormField label="QR (défaut)">
                    <Input
                      type="checkbox"
                      checked={defaultQrEnabled}
                      onChange={(e) => setDefaultQrEnabled(e.target.checked)}
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

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Délais notifications
                  <HintTooltip text="Contrôle les relances automatiques pour validations manager et check-out oublié." />
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Relance check-out oublié (min)"
                    hint="Délai après début fenêtre départ avant la première relance employé."
                  >
                    <Input
                      type="number"
                      min={0}
                      max={1440}
                      value={notificationUnclosedReminderDelayMinutes}
                      onChange={(e) =>
                        setNotificationUnclosedReminderDelayMinutes(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </FormField>
                  <FormField
                    label="Relance review manager (min)"
                    hint="Age minimum d’un élément REVIEW_REQUIRED avant relance manager."
                  >
                    <Input
                      type="number"
                      min={0}
                      max={10080}
                      value={notificationReviewReminderMinAgeMinutes}
                      onChange={(e) =>
                        setNotificationReviewReminderMinAgeMinutes(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </FormField>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Politique offline (kiosk)
                  <HintTooltip text="Détermine si la borne peut synchroniser des événements capturés hors ligne (visage/NFC)." />
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Autoriser la sync offline">
                    <Input
                      type="checkbox"
                      checked={allowOfflineSync}
                      onChange={(e) => setAllowOfflineSync(e.target.checked)}
                    />
                  </FormField>
                  <FormField
                    label="Ancienneté max event offline (min)"
                    hint="Au-delà de ce délai, la sync offline est rejetée."
                  >
                    <Input
                      type="number"
                      min={5}
                      max={10080}
                      value={offlineSyncMaxAgeMinutes}
                      onChange={(e) =>
                        setOfflineSyncMaxAgeMinutes(Math.max(5, Number(e.target.value) || 5))
                      }
                      disabled={!allowOfflineSync}
                    />
                  </FormField>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  RGPD photos faciales
                  <HintTooltip text="Conserve les logs de reconnaissance, mais supprime automatiquement l’image après ce délai." />
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Rétention photo (jours)"
                    hint="0 = suppression immédiate à la prochaine purge automatique."
                  >
                    <Input
                      type="number"
                      min={0}
                      max={3650}
                      value={faceLogPhotoRetentionDays}
                      onChange={(e) =>
                        setFaceLogPhotoRetentionDays(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </FormField>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4 dark:border-neutral-800">
                <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-200">
                  Webhooks
                  <HintTooltip text="Émet des événements signés HMAC SHA-256 vers votre endpoint." />
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Activer les webhooks">
                    <Input
                      type="checkbox"
                      checked={webhookEnabled}
                      onChange={(e) => setWebhookEnabled(e.target.checked)}
                    />
                  </FormField>
                  <FormField label="URL endpoint webhook">
                    <Input
                      type="url"
                      value={webhookUrl}
                      placeholder="https://example.com/timegate/webhook"
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Secret de signature"
                    hint="Header: x-timegate-signature = sha256=<hmac(timestamp.body)>"
                  >
                    <Input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
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
