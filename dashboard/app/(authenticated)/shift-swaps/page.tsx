'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input } from '@/components/ui/FormField'
import DataTable from '@/components/ui/DataTable'
import { listEmployees } from '@/lib/timegate/employees'
import { listShiftAssignments } from '@/lib/timegate/shift-assignments'
import {
  createShiftSwap,
  listShiftSwaps,
  reviewShiftSwap,
  type ShiftSwapRequest,
} from '@/lib/timegate/shift-swaps'
import { HttpError } from '@/lib/http'

const statusLabel: Record<ShiftSwapRequest['status'], string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
}

export default function ShiftSwapsPage() {
  const [rows, setRows] = useState<ShiftSwapRequest[]>([])
  const [employees, setEmployees] = useState<Array<{ id: string; label: string }>>([])
  const [assignments, setAssignments] = useState<Array<{ id: string; label: string }>>([])
  const [requesterEmployeeId, setRequesterEmployeeId] = useState('')
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [shiftAssignmentId, setShiftAssignmentId] = useState('')
  const [swapDate, setSwapDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listShiftSwaps({ page: 1, limit: 50 })
      setRows(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    void listEmployees({ page: 1, limit: 200 }).then((res) =>
      setEmployees(
        res.data.map((e) => ({
          id: e.id,
          label: `${e.firstName} ${e.lastName}`.trim(),
        })),
      ),
    )
    void listShiftAssignments({ page: 1, limit: 200 }).then((res) =>
      setAssignments(
        res.data.map((a) => ({
          id: a.id,
          label: `${a.employee?.firstName ?? ''} ${a.employee?.lastName ?? ''} — ${a.shiftType?.name ?? 'Horaire'}`.trim(),
        })),
      ),
    )
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createShiftSwap({
        requesterEmployeeId,
        targetEmployeeId: targetEmployeeId || undefined,
        shiftAssignmentId: shiftAssignmentId || undefined,
        swapDate,
        reason: reason || undefined,
      })
      setReason('')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible')
    }
  }

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    await reviewShiftSwap(id, { status })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'Échanges de shifts' }]} />
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Demandes d&apos;échange entre employés — à l&apos;approbation, les affectations requester ↔ cible sont permutées.
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form onSubmit={(e) => void handleCreate(e)} className="rounded-xl border p-4 grid md:grid-cols-2 gap-4 dark:border-neutral-700">
        <FormField label="Demandeur">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
            value={requesterEmployeeId}
            onChange={(e) => setRequesterEmployeeId(e.target.value)}
            required
          >
            <option value="">Choisir…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Collègue cible (optionnel)">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
            value={targetEmployeeId}
            onChange={(e) => setTargetEmployeeId(e.target.value)}
          >
            <option value="">—</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Affectation (optionnel)">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
            value={shiftAssignmentId}
            onChange={(e) => setShiftAssignmentId(e.target.value)}
          >
            <option value="">—</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Date">
          <Input type="date" value={swapDate} onChange={(e) => setSwapDate(e.target.value)} required />
        </FormField>
        <FormField label="Motif">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optionnel" />
        </FormField>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
            Créer la demande
          </button>
        </div>
      </form>

      <DataTable<ShiftSwapRequest>
        data={rows}
        loading={loading}
        columns={[
          { key: 'swapDate', label: 'Date', render: (_v, row) => row.swapDate },
          {
            key: 'requester',
            label: 'Demandeur',
            render: (_v, row) => `${row.requester.firstName} ${row.requester.lastName}`,
          },
          {
            key: 'target',
            label: 'Cible',
            render: (_v, row) =>
              row.target ? `${row.target.firstName} ${row.target.lastName}` : '—',
          },
          {
            key: 'status',
            label: 'Statut',
            render: (_v, row) => statusLabel[row.status],
          },
          {
            key: 'actions',
            label: '',
            render: (_v, row) =>
              row.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-emerald-600"
                    onClick={() => void handleReview(row.id, 'APPROVED')}
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() => void handleReview(row.id, 'REJECTED')}
                  >
                    Refuser
                  </button>
                </div>
              ) : null,
          },
        ]}
      />
    </div>
  )
}
