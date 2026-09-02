'use client'

import { SettingsFormSection } from '@/components/organization/SettingsFormSection'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import type { SelectOption } from '@/components/ui/select-search-types'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import {
  getTenantAttendanceSettings,
  updateTenantAttendanceSettings,
} from '@/lib/timegate/tenant-settings'
import { useCallback, useEffect, useState } from 'react'

const ROUNDING_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
]

export default function TenantAttendanceSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
  const [defaultBreakWindowStart, setDefaultBreakWindowStart] = useState('12:00')
  const [defaultBreakWindowEnd, setDefaultBreakWindowEnd] = useState('13:00')
  const [allowCheckInAfterBreakStart, setAllowCheckInAfterBreakStart] = useState(true)
  const [minConfidence, setMinConfidence] = useState(0.75)
  const [lateThreshold, setLateThreshold] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const settings = await getTenantAttendanceSettings()
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
      setDefaultBreakWindowStart(settings.defaultBreakWindowStart ?? '12:00')
      setDefaultBreakWindowEnd(settings.defaultBreakWindowEnd ?? '13:00')
      setAllowCheckInAfterBreakStart(settings.allowCheckInAfterBreakStart ?? true)
      setMinConfidence(settings.minConfidence ?? 0.75)
      setLateThreshold(settings.lateThreshold ?? 10)
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
      const saved = await updateTenantAttendanceSettings({
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
        defaultBreakWindowStart: defaultBreakWindowStart.trim() || null,
        defaultBreakWindowEnd: defaultBreakWindowEnd.trim() || null,
        allowCheckInAfterBreakStart,
        minConfidence,
        lateThreshold,
      })
      const kioskMsg =
        saved.kiosksUpdated && saved.kiosksUpdated > 0
          ? ` ${saved.kiosksUpdated} kiosque(s) mis à jour.`
          : ''
      setSuccess(`Paramètres enregistrés.${kioskMsg}`)
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
          { label: 'Paramètres de pointage' },
        ]}
      />

      {error ? <ApiErrorBanner message={error} /> : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      {loading ? (
        <SkeletonDetailCard />
      ) : (
        <form onSubmit={handleSave}>
          <FormCard
            title="Paramètres de pointage"
            hint="Réglages globaux de l'organisation. Les méthodes de pointage ci-dessous sont propagées à tous les kiosques existants à l'enregistrement."
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <SettingsFormSection
                title="Reconnaissance & retards"
                hint="Seuils faciaux et de retard pour le calcul des journées."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Confiance faciale min."
                    hint="0 à 1 — seuil pour accepter une reconnaissance."
                  >
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(Number(e.target.value))}
                    />
                  </FormField>
                  <FormField
                    label="Seuil retard (min)"
                    hint="Tolérance avant de compter un retard (si l’horaire n’a pas sa propre tolérance)."
                  >
                    <Input
                      type="number"
                      min={0}
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </FormField>
                </div>
              </SettingsFormSection>

              <SettingsFormSection
                title="Délais notifications"
                hint="Contrôle les relances automatiques pour validations manager et check-out oublié."
              >
                <div className="grid gap-4 sm:grid-cols-2">
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
                    hint="Âge minimum d’un élément REVIEW_REQUIRED avant relance manager."
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
              </SettingsFormSection>

              <SettingsFormSection
                className="lg:col-span-2"
                title="Méthodes de pointage (kiosques)"
                hint="À l'enregistrement, ces options sont appliquées à tous les kiosques de l'organisation (y compris ceux déjà créés). Vous pouvez encore ajuster un kiosque individuellement ensuite."
              >
                <div className="grid gap-1 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200/80 dark:sm:divide-border-dark">
                  <SwitcherField
                    className="rounded-lg px-3 py-2 sm:rounded-none"
                    label="Reconnaissance faciale"
                    description="Visage activé sur les kiosques"
                    checked={defaultFaceEnabled}
                    onCheckedChange={setDefaultFaceEnabled}
                  />
                  <SwitcherField
                    className="rounded-lg px-3 py-2 sm:rounded-none sm:px-4"
                    label="Badge NFC"
                    description="NFC activé sur les kiosques"
                    checked={defaultNfcEnabled}
                    onCheckedChange={setDefaultNfcEnabled}
                  />
                  <SwitcherField
                    className="rounded-lg px-3 py-2 sm:rounded-none sm:px-4"
                    label="QR-code"
                    description="QR activé sur les kiosques"
                    checked={defaultQrEnabled}
                    onCheckedChange={setDefaultQrEnabled}
                  />
                </div>
              </SettingsFormSection>

              <SettingsFormSection
                title="Politique timesheet"
                hint="Appliquée lors du recalcul des journées. Les seuils de retard sont ci-dessus ; la tolérance peut aussi venir de l'horaire type."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Arrondi (minutes)" hint="0 = aucun, 5 ou 15 min au plus proche.">
                    <SelectSearch
                      instanceId="tenant-rounding"
                      options={ROUNDING_OPTIONS}
                      value={
                        ROUNDING_OPTIONS.find(
                          (o) => o.value === String(timesheetRoundingMinutes),
                        ) ?? null
                      }
                      onChange={(opt) => setTimesheetRoundingMinutes(Number(opt?.value ?? 0))}
                    />
                  </FormField>
                  <FormField
                    label="Alerte Heures Supplémentaires"
                    hint="Notification si Heures Supplémentaires ≥ seuil sur une journée clôturée."
                  >
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
                  <div className="col-span-2">
                    <FormField
                      label="Repos min. entre journées de travail"
                      hint="Ex. 660 = 11 h entre deux journées."
                    >
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
              </SettingsFormSection>

              <SettingsFormSection
                title="Pause (défaut)"
                hint="Pause automatique figée, préremplie à la création d'un nouvel horaire type. Ex. 12:00–13:00 = 60 min déduites."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Début de pause">
                    <Input
                      type="time"
                      value={defaultBreakWindowStart}
                      onChange={(e) => setDefaultBreakWindowStart(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Fin de pause">
                    <Input
                      type="time"
                      value={defaultBreakWindowEnd}
                      onChange={(e) => setDefaultBreakWindowEnd(e.target.value)}
                    />
                  </FormField>
                </div>
                <SwitcherField
                  label="Autoriser l'arrivée après début de pause"
                  description="Si désactivé, un check-in sans arrivée préalable est refusé dès le début de la pause."
                  checked={allowCheckInAfterBreakStart}
                  onCheckedChange={setAllowCheckInAfterBreakStart}
                />
              </SettingsFormSection>

              <SettingsFormSection
                title="Politique offline (kiosk)"
                hint="Détermine si la borne peut synchroniser des événements capturés hors ligne (visage/NFC)."
              >
                <SwitcherField
                  label="Autoriser la sync offline"
                  description="Accepte les pointages capturés hors connexion"
                  checked={allowOfflineSync}
                  onCheckedChange={setAllowOfflineSync}
                />
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
              </SettingsFormSection>

              <SettingsFormSection
                title="RGPD photos faciales"
                hint="Conserve les logs de reconnaissance, mais supprime automatiquement l’image après ce délai."
              >
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
              </SettingsFormSection>

              <SettingsFormSection
                className="lg:col-span-2"
                title="Webhooks"
                hint="Émet des événements signés HMAC SHA-256 vers votre endpoint."
              >
                <SwitcherField
                  label="Activer les webhooks"
                  description="Envoie les événements vers l’URL configurée"
                  checked={webhookEnabled}
                  onCheckedChange={setWebhookEnabled}
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <FormField label="URL endpoint webhook">
                    <Input
                      type="url"
                      value={webhookUrl}
                      placeholder="https://example.com/timegate/webhook"
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      disabled={!webhookEnabled}
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
                      disabled={!webhookEnabled}
                    />
                  </FormField>
                </div>
              </SettingsFormSection>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  )
}
