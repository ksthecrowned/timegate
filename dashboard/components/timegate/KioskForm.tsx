'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import { HintTooltip } from '@/components/ui/HintTooltip'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import type { KioskPayload, KioskUpdatePayload } from '@/lib/timegate/kiosks'
import { listShiftLocations } from '@/lib/timegate/shift-locations'
import { HttpError } from '@/lib/http'
import { getTenantAttendanceSettings } from '@/lib/timegate/tenant-settings'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type KioskFormValues = KioskPayload & { isActive?: boolean }

type KioskFormProps = {
  initial?: Partial<KioskFormValues>
  submitLabel: string
  onSubmit: (values: KioskPayload | KioskUpdatePayload) => Promise<void>
  onCancel?: () => void
  showActiveToggle?: boolean
}

export default function KioskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  showActiveToggle,
}: KioskFormProps) {
  const [form, setForm] = useState<KioskFormValues>({
    name: initial?.name ?? '',
    branchId: initial?.branchId ?? '',
    shiftLocationId: initial?.shiftLocationId ?? '',
    isActive: initial?.isActive ?? true,
    faceEnabled: initial?.faceEnabled ?? true,
    nfcEnabled: initial?.nfcEnabled ?? false,
    qrEnabled: initial?.qrEnabled ?? false,
  })
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) => {
      setBranchOptions(toSelectOptions(res.data))
    })
  }, [])

  useEffect(() => {
    if (initial) return
    void getTenantAttendanceSettings()
      .then((settings) => {
        setForm((f) => ({
          ...f,
          faceEnabled: settings.defaultFaceEnabled ?? true,
          nfcEnabled: settings.defaultNfcEnabled ?? false,
          qrEnabled: settings.defaultQrEnabled ?? false,
        }))
      })
      .catch(() => undefined)
  }, [initial])

  useEffect(() => {
    if (!form.branchId) {
      setLocationOptions([])
      return
    }
    void listShiftLocations({ branchId: form.branchId, limit: 100 }).then((res) => {
      setLocationOptions(toSelectOptions(res.data))
    })
  }, [form.branchId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload: KioskUpdatePayload = {
        name: form.name.trim(),
        branchId: form.branchId,
        shiftLocationId: form.shiftLocationId || undefined,
        faceEnabled: form.faceEnabled,
        nfcEnabled: form.nfcEnabled,
        qrEnabled: form.qrEnabled,
        ...(showActiveToggle ? { isActive: form.isActive } : {}),
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Kiosque"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nom *">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Branche *">
            <SelectSearch
              instanceId="kiosk-branch"
              options={branchOptions}
              value={findOption(branchOptions, form.branchId)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  branchId: opt?.value ?? '',
                  shiftLocationId: '',
                }))
              }
              placeholder="Sélectionner…"
            />
          </FormField>
          <FormField
            label={
              <span className="inline-flex items-center gap-1">
                Emplacement horaire
                <HintTooltip text="Zone physique optionnelle pour restreindre les employés éligibles au pointage sur ce kiosk (ex. entrée principale, entrepôt). Laissez vide pour tous les employés de la branche." />
              </span>
            }
          >
            <SelectSearch
              instanceId="kiosk-shift-location"
              options={locationOptions}
              value={findOption(locationOptions, form.shiftLocationId ?? '')}
              onChange={(opt) => setForm((f) => ({ ...f, shiftLocationId: opt?.value ?? '' }))}
              placeholder={form.branchId ? 'Toute la branche' : 'Choisir une branche d’abord'}
              isClearable
              isDisabled={!form.branchId}
            />
          </FormField>
          {showActiveToggle && (
            <FormField label="Statut">
              <SwitcherField
                label="Kiosque actif"
                checked={form.isActive ?? true}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
            </FormField>
          )}
          <FormField label="Méthodes de pointage">
            <div className="flex flex-col gap-2 pt-1">
              <SwitcherField
                label="Reconnaissance faciale"
                checked={form.faceEnabled ?? true}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, faceEnabled: checked }))}
              />
              <SwitcherField
                label="Badge NFC"
                checked={form.nfcEnabled ?? false}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, nfcEnabled: checked }))}
              />
              <SwitcherField
                label="QR-code"
                checked={form.qrEnabled ?? false}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, qrEnabled: checked }))}
              />
            </div>
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
