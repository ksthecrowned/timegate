'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
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
import { findOption } from '@/lib/select-options'
import ActionButtons from '@/components/ui/ActionButtons'
import { REVIEW_STATUS } from '@/constants'

const statusLabel: Record<ShiftSwapRequest['status'], string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
}

export default function ShiftSwapsPage() {
  const [rows, setRows] = useState<ShiftSwapRequest[]>([])
  const [employees, setEmployees] = useState<Array<{ value: string; label: string }>>([])
  const [assignments, setAssignments] = useState<Array<{ value: string; label: string }>>([])
  const [requesterEmployeeId, setRequesterEmployeeId] = useState('')
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [shiftAssignmentId, setShiftAssignmentId] = useState('')
  const [swapDate, setSwapDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

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
    void listEmployees({ page: 1, limit: 100 }).then((res) =>
      setEmployees(
        res.data.map((e) => ({
          value: e.id,
          label: `${e.firstName} ${e.lastName}`.trim(),
        })),
      ),
    )
    void listShiftAssignments({ page: 1, limit: 100 }).then((res) =>
      setAssignments(
        res.data.map((a) => ({
          value: a.id,
          label: `${a.employee?.firstName ?? ''} ${a.employee?.lastName ?? ''} — ${a.shiftType?.name ?? 'Horaire'}`.trim(),
        })),
      ),
    )
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      await createShiftSwap({
        requesterEmployeeId,
        targetEmployeeId,
        shiftAssignmentId: shiftAssignmentId || undefined,
        swapDate,
        reason: reason || undefined,
      })
      setReason('')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible')
    } finally {
      setCreating(false)
    }
  }

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('')
    try {
      await reviewShiftSwap(id, { status })
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Action impossible')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'Échanges de shifts' }]} />
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Demandes d&apos;échange entre employés — à l&apos;approbation, les affectations requester ↔ cible sont permutées.
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form
        className="rounded-xl border p-4 grid md:grid-cols-2 gap-4 dark:border-neutral-700"
      >
        <FormField label="Demandeur">
          <SelectSearch
            options={employees}
            value={findOption(employees, requesterEmployeeId)}
            required
            onChange={(opt) => setRequesterEmployeeId(opt?.value ?? '')}
          />
        </FormField>
        <FormField label="Collègue cible">
          <SelectSearch
            options={employees}
            value={findOption(employees, targetEmployeeId)}
            required
            onChange={(opt) => setTargetEmployeeId(opt?.value ?? '')}
          />
        </FormField>
        <FormField label="Affectation (optionnel)">
          <SelectSearch
            options={assignments}
            value={findOption(assignments, shiftAssignmentId)}
            onChange={(opt) => setShiftAssignmentId(opt?.value ?? '')}
          />
        </FormField>
        <FormField label="Date">
          <Input type="date" value={swapDate} onChange={(e) => setSwapDate(e.target.value)} required />
        </FormField>
        <FormField label="Motif">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optionnel" />
        </FormField>
        <div className="md:col-span-2">
          <button
            onClick={(e) => handleSubmit(e)}
            type="button"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {creating ? "Création..." : "Créer la demande"}
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
        ]}
        actions={(row) => (
          <ActionButtons
            handleReview={(status: REVIEW_STATUS) => {
              void handleReview(row.id, status).then(load)
            }}
            reviewActions={
              row.status === 'PENDING'
                ? [
                    ...(row.target
                      ? [
                          {
                            label: 'Approuver',
                            actionStatus: 'APPROVED' as const,
                            cls: 'focus:outline-none text-green-200 bg-green-700',
                          },
                        ]
                      : []),
                    {
                      label: 'Refuser',
                      actionStatus: 'REJECTED' as const,
                      cls: 'focus:outline-none text-red-200 bg-red-700',
                    },
                  ]
                : []
            }
            deleteMessage="Cette branche sera définitivement supprimée."
          />
        )}
      />
    </div>
  )
}
