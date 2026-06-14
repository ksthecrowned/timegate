'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createEmployeeLeave,
  getMyLeaveBalances,
  listEmployeeLeaveTypes,
  listEmployeeLeaves,
} from '@/lib/api'
import type { EmployeeLeave, LeaveType } from '@/lib/types'
import { ErrorBanner, MobileCard, PrimaryButton, SuccessBanner } from '@/components/ui'

const leaveStatusLabel: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState(todayIsoDate())
  const [endDate, setEndDate] = useState(todayIsoDate())
  const [reason, setReason] = useState('')
  const [balanceHint, setBalanceHint] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [leaveRows, types] = await Promise.all([
        listEmployeeLeaves({ limit: 50 }),
        listEmployeeLeaveTypes(),
      ])
      setLeaves(leaveRows.data)
      setLeaveTypes(types.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void getMyLeaveBalances()
      .then((result) => {
        const selected = result.balances.find((b) =>
          leaveTypeId ? b.leaveTypeId === leaveTypeId : !b.unlimited,
        )
        if (!selected) {
          setBalanceHint('')
          return
        }
        if (selected.unlimited) {
          setBalanceHint(`${selected.leaveTypeName} : sans limite`)
          return
        }
        setBalanceHint(`${selected.leaveTypeName} : ${selected.remaining ?? 0} jour(s) restant(s)`)
      })
      .catch(() => setBalanceHint(''))
  }, [leaveTypeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await createEmployeeLeave({
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        leaveTypeId: leaveTypeId || undefined,
      })
      setSuccess('Demande envoyée.')
      setReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <MobileCard title="Nouvelle demande">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <label className="block text-xs font-semibold text-text-muted">
            Type de congé
            <select
              className="mt-1"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              <option value="">Par défaut</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          {balanceHint ? <p className="text-xs text-accent">{balanceHint}</p> : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-text-muted">
              Du
              <input
                type="date"
                className="mt-1"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-text-muted">
              Au
              <input
                type="date"
                className="mt-1"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-text-muted">
            Motif
            <textarea
              className="mt-1 min-h-[80px] resize-y"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optionnel"
            />
          </label>

          <ErrorBanner message={error} />
          <SuccessBanner message={success} />

          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Envoyer la demande'}
          </PrimaryButton>
        </form>
      </MobileCard>

      <MobileCard title="Historique">
        {loading ? (
          <p className="text-sm text-text-muted">Chargement…</p>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune demande.</p>
        ) : (
          <ul className="space-y-3">
            {leaves.map((leave) => (
              <li key={leave.id} className="border-t border-white/8 pt-3 text-sm first:border-0 first:pt-0">
                <p>
                  {leave.startDate?.slice(0, 10)} → {leave.endDate?.slice(0, 10)}
                  {leave.type ? ` · ${leave.type}` : ''}
                </p>
                <p className="text-xs text-text-muted">
                  {leaveStatusLabel[leave.status] ?? leave.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </MobileCard>
    </div>
  )
}
