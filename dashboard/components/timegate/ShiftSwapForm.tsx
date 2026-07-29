'use client'

import {
  ApiErrorBanner,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { FormField, Input, SelectSearch, Textarea } from '@/components/ui/FormField'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { listEmployees } from '@/lib/timegate/employees'
import { listShiftAssignments } from '@/lib/timegate/shift-assignments'
import { createShiftSwap } from '@/lib/timegate/shift-swaps'
import { useEffect, useState } from 'react'

export type ShiftSwapFormValues = {
  requesterEmployeeId: string
  targetEmployeeId: string
  shiftAssignmentId?: string
  swapDate: string
  reason?: string
}

type Props = {
  submitLabel?: string
  onCancel: () => void
  onSubmit?: (values: ShiftSwapFormValues) => Promise<void>
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ShiftSwapForm({
  submitLabel = 'Créer la demande',
  onCancel,
  onSubmit,
}: Props) {
  const [employees, setEmployees] = useState<Array<{ value: string; label: string }>>([])
  const [assignments, setAssignments] = useState<Array<{ value: string; label: string }>>([])
  const [requesterEmployeeId, setRequesterEmployeeId] = useState('')
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [shiftAssignmentId, setShiftAssignmentId] = useState('')
  const [swapDate, setSwapDate] = useState(todayIso)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void listEmployees({ page: 1, limit: 100 }).then((res) =>
      setEmployees(
        res.data.map((e) => ({
          value: e.id,
          label: employeeDisplayName(e),
        })),
      ),
    )
    void listShiftAssignments({ page: 1, limit: 100 }).then((res) =>
      setAssignments(
        res.data.map((a) => ({
          value: a.id,
          label: `${employeeDisplayName(a.employee)} — ${a.shiftType?.name ?? 'Horaire'}`.trim(),
        })),
      ),
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!requesterEmployeeId || !targetEmployeeId || !swapDate) {
      setError('Demandeur, collègue cible et date sont requis.')
      return
    }
    if (requesterEmployeeId === targetEmployeeId) {
      setError('Le demandeur et le collègue cible doivent être distincts.')
      return
    }
    setSubmitting(true)
    try {
      const values: ShiftSwapFormValues = {
        requesterEmployeeId,
        targetEmployeeId,
        swapDate,
        ...(shiftAssignmentId ? { shiftAssignmentId } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }
      if (onSubmit) await onSubmit(values)
      else await createShiftSwap(values)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <ApiErrorBanner message={error} />
      <FormCard
        title="Nouvelle demande d’échange"
        hint="Échange ponctuel : seul le jour choisi est échangé. Les affectations habituelles des autres jours restent inchangées. Si la cible n’a pas de shift ce jour-là, elle reprend le créneau du demandeur."
        footer={
          <>
            <button type="button" onClick={onCancel} className={secondaryBtnClass}>
              Annuler
            </button>
            <button type="submit" disabled={submitting} className={primaryBtnClass}>
              {submitting ? 'Création…' : submitLabel}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Demandeur" required>
            <SelectSearch
              instanceId="shift-swap-requester"
              options={employees}
              value={findOption(employees, requesterEmployeeId)}
              onChange={(opt) => setRequesterEmployeeId(opt?.value ?? '')}
              required
            />
          </FormField>
          <FormField label="Collègue cible" required>
            <SelectSearch
              instanceId="shift-swap-target"
              options={employees}
              value={findOption(employees, targetEmployeeId)}
              onChange={(opt) => setTargetEmployeeId(opt?.value ?? '')}
              required
            />
          </FormField>
          <FormField label="Affectation (optionnel)">
            <SelectSearch
              instanceId="shift-swap-assignment"
              options={assignments}
              value={findOption(assignments, shiftAssignmentId)}
              onChange={(opt) => setShiftAssignmentId(opt?.value ?? '')}
              isClearable
              placeholder="Choisir une affectation…"
            />
          </FormField>
          <FormField label="Date de l’échange" required>
            <Input
              type="date"
              value={swapDate}
              onChange={(e) => setSwapDate(e.target.value)}
              required
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Motif">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex. contrainte familiale, formation…"
              />
            </FormField>
          </div>
        </div>
      </FormCard>
    </form>
  )
}
