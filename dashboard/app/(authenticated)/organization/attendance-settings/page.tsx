'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import { HintTooltip } from '@/components/ui/HintTooltip'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import {
  getTenantAttendanceSettings,
  updateTenantAttendanceSettings,
} from '@/lib/timegate/tenant-settings'
import type { SelectOption } from '@/components/ui/select-search-types'

const ROUNDING_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5 minutes' },
  { value: '15', label: '15 minutes' },
]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="md:col-span-2 border-t border-slate-200/80 pt-5 dark:border-border-dark">
      <h3 className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-neutral-200">
        {title}
        {hint ? <HintTooltip text={hint} /> : null}
      </h3>
      {children}
    </div>
  )
}

export default function TenantAttendanceSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
  const [defaultBreakWindowStart, setDefaultBreakWindowStart] = useState('12:00')
  const [defaultBreakWindowEnd, setDefaultBreakWindowEnd] = useState('13:00')
  const [defaultBreakDurationMinutes, setDefaultBreakDurationMinutes] = useState(60)
  const [minConfidence, setMinConfidence] = useState(0.75)
  const [lateThreshold, setLateThreshold] = useState(10)
  const [veryLateThreshold, setVeryLateThreshold] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const settings = await getTenantAttendanceSettings()
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
      setDefaultBreakWindowStart(settings.defaultBreakWindowStart ?? '12:00')
      setDefaultBreakWindowEnd(settings.defaultBreakWindowEnd ?? '13:00')
      setDefaultBreakDurationMinutes(settings.defaultBreakDurationMinutes ?? 60)
      setMinConfidence(settings.minConfidence ?? 0.75)
      setLateThreshold(settings.lateThreshold ?? 10)
      setVeryLateThreshold(settings.veryLateThreshold ?? 30)
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
        defaultBreakWindowStart: defaultBreakWindowStart.trim() || null,
        defaultBreakWindowEnd: defaultBreakWindowEnd.trim() || null,
        defaultBreakDurationMinutes,
        minConfidence,
        lateThreshold,
        veryLateThreshold,
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
            hint="Ces réglages s'appliquent à tous les kiosques de votre organisation. Les méthodes (visage, NFC, QR) se configurent par kiosque."
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid max-w-3xl gap-6 md:grid-cols-2">
              <Section
                title="Reconnaissance & retards"
                hint="Seuils faciaux et de retard pour le calcul des journées."
              >
                <div className="grid gap-4 md:grid-cols-3">
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
                  <FormField label="Seuil retard (min)">
                    <Input
                      type="number"
                      min={0}
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </FormField>
                  <FormField label="Seuil retard majeur (min)">
                    <Input
                      type="number"
                      min={0}
                      value={veryLateThreshold}
                      onChange={(e) =>
                        setVeryLateThreshold(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </FormField>
                </div>
              </Section>

              <Section
                title="Fallback PIN (kiosque)"
                hint="Après le seuil d'échecs sur visage ou NFC, le kiosque propose le PIN puis impose ce délai avant de réessayer le mode principal."
              >
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
                        setPinFailureCooldownSeconds(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </FormField>
                </div>
              </Section>

              <Section
                title="Méthodes kiosque par défaut"
                hint="Appliquées automatiquement à la création d’un nouveau kiosque. Modifiables ensuite au cas par cas."
              >
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 dark:divide-border-dark dark:border-border-dark">
                  <SwitcherField
                    className="px-4 py-3"
                    label="Reconnaissance faciale"
                    description="Activée par défaut sur les nouveaux kiosques"
                    checked={defaultFaceEnabled}
                    onCheckedChange={setDefaultFaceEnabled}
                  />
                  <SwitcherField
                    className="px-4 py-3"
                    label="Badge NFC"
                    description="Lecture de badge sur la borne"
                    checked={defaultNfcEnabled}
                    onCheckedChange={setDefaultNfcEnabled}
                  />
                  <SwitcherField
                    className="px-4 py-3"
                    label="QR-code"
                    description="Scan du QR employé"
                    checked={defaultQrEnabled}
                    onCheckedChange={setDefaultQrEnabled}
                  />
                </div>
              </Section>

              <Section
                title="Politique timesheet"
                hint="Appliquée lors du recalcul des journées. Les seuils de retard sont ci-dessus (Reconnaissance & retards) ; la tolérance peut aussi venir de l'horaire type."
              >
                <div className="grid gap-4 md:grid-cols-3">
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
                    label="Alerte HS (min)"
                    hint="Notification si HS ≥ seuil sur une journée clôturée."
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
                  <FormField
                    label="Repos min. entre shifts (min)"
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
              </Section>

              <Section
                title="Pause (défaut)"
                hint="Valeurs préremplies à la création d'un nouvel horaire type. Chaque horaire peut ensuite les modifier."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Début fenêtre pause">
                    <Input
                      type="time"
                      value={defaultBreakWindowStart}
                      onChange={(e) => setDefaultBreakWindowStart(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Fin fenêtre pause">
                    <Input
                      type="time"
                      value={defaultBreakWindowEnd}
                      onChange={(e) => setDefaultBreakWindowEnd(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Durée pause (min)" hint="Durée attendue de la pause.">
                    <Input
                      type="number"
                      min={0}
                      max={480}
                      value={defaultBreakDurationMinutes}
                      onChange={(e) =>
                        setDefaultBreakDurationMinutes(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </FormField>
                </div>
              </Section>

              <Section
                title="Délais notifications"
                hint="Contrôle les relances automatiques pour validations manager et check-out oublié."
              >
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
              </Section>

              <Section
                title="Politique offline (kiosk)"
                hint="Détermine si la borne peut synchroniser des événements capturés hors ligne (visage/NFC)."
              >
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200/80 px-4 py-3 dark:border-border-dark">
                    <SwitcherField
                      label="Autoriser la sync offline"
                      description="Accepte les pointages capturés hors connexion"
                      checked={allowOfflineSync}
                      onCheckedChange={setAllowOfflineSync}
                    />
                  </div>
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
              </Section>

              <Section
                title="RGPD photos faciales"
                hint="Conserve les logs de reconnaissance, mais supprime automatiquement l’image après ce délai."
              >
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
              </Section>

              <Section
                title="Webhooks"
                hint="Émet des événements signés HMAC SHA-256 vers votre endpoint."
              >
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200/80 px-4 py-3 dark:border-border-dark">
                    <SwitcherField
                      label="Activer les webhooks"
                      description="Envoie les événements vers l’URL configurée"
                      checked={webhookEnabled}
                      onCheckedChange={setWebhookEnabled}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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
                </div>
              </Section>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  )
}
