'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import type { KioskPayload, KioskUpdatePayload } from '@/lib/timegate/kiosks'
import { HttpError } from '@/lib/http'
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
    isActive: initial?.isActive ?? true,
    faceEnabled: initial?.faceEnabled ?? true,
    nfcEnabled: initial?.nfcEnabled ?? false,
    qrEnabled: initial?.qrEnabled ?? false,
  })
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) => {
      setBranchOptions(toSelectOptions(res.data))
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload: KioskUpdatePayload = {
        name: form.name.trim(),
        branchId: form.branchId,
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
              onChange={(opt) => setForm((f) => ({ ...f, branchId: opt?.value ?? '' }))}
              placeholder="Sélectionner…"
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
