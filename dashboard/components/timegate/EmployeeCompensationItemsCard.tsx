'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiErrorBanner, DetailCard, primaryBtnClass } from '@/components/timegate/ui'
import EmployeeCompensationItemForm from '@/components/timegate/EmployeeCompensationItemForm'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import {
  createEmployeeCompensationItem,
  deleteEmployeeCompensationItem,
  listEmployeeCompensationItems,
  updateEmployeeCompensationItem,
  type EmployeeCompensationItem,
} from '@/lib/timegate/employee-compensation'

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const KIND_LABELS: Record<string, string> = {
  ALLOWANCE: 'Indemnité',
  DEDUCTION: 'Retenue',
}

export default function EmployeeCompensationItemsCard({ employeeId }: { employeeId: string }) {
  const [items, setItems] = useState<EmployeeCompensationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingItem, setEditingItem] = useState<EmployeeCompensationItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listEmployeeCompensationItems(employeeId)
      setItems(data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger la rémunération.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string) {
    setError('')
    try {
      await deleteEmployeeCompensationItem(employeeId, id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Suppression impossible.')
    }
  }

  return (
    <DetailCard
      title="Rémunération"
      actions={
        <button
          type="button"
          className={primaryBtnClass}
          onClick={() => {
            setEditingItem(null)
            setShowCreate((prev) => !prev)
          }}
        >
          {showCreate ? 'Fermer' : 'Ajouter'}
        </button>
      }
    >
      <div className="px-4 pt-4 md:px-5">
        <ApiErrorBanner message={error} />
      </div>

      {showCreate ? (
        <div className="px-4 pb-4 md:px-5">
          <EmployeeCompensationItemForm
            submitLabel="Créer"
            onCancel={() => setShowCreate(false)}
            onSubmit={async (values) => {
              await createEmployeeCompensationItem(employeeId, values)
              setShowCreate(false)
              await load()
            }}
          />
        </div>
      ) : null}

      {loading ? (
        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 md:px-5">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300 md:px-5">
          Aucune indemnité ou retenue configurée pour cet employé.
        </p>
      ) : (
        <div className="overflow-x-auto px-4 pb-4 md:px-5">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-3 font-semibold">Label</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Montant</th>
                <th className="py-2 pr-3 font-semibold">Depuis</th>
                <th className="py-2 pr-3 font-semibold">Jusqu&apos;au</th>
                <th className="py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">{item.label}</td>
                  <td className="py-2 pr-3">{KIND_LABELS[item.kind] ?? item.kind}</td>
                  <td className="py-2 pr-3">{formatMoney(item.amount)}</td>
                  <td className="py-2 pr-3">{formatApiDate(item.effectiveFrom)}</td>
                  <td className="py-2 pr-3">
                    {item.effectiveTo ? formatApiDate(item.effectiveTo) : '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          setShowCreate(false)
                          setEditingItem(item)
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline dark:text-red-400"
                        onClick={() => void handleDelete(item.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingItem ? (
        <div className="border-t border-slate-200 px-4 py-4 md:px-5 dark:border-slate-700">
          <EmployeeCompensationItemForm
            initial={{
              label: editingItem.label,
              kind: editingItem.kind,
              amount: editingItem.amount,
              effectiveFrom: editingItem.effectiveFrom.slice(0, 10),
              effectiveTo: editingItem.effectiveTo ? editingItem.effectiveTo.slice(0, 10) : undefined,
            }}
            submitLabel="Enregistrer"
            onCancel={() => setEditingItem(null)}
            onSubmit={async (values) => {
              await updateEmployeeCompensationItem(employeeId, editingItem.id, values)
              setEditingItem(null)
              await load()
            }}
          />
        </div>
      ) : null}
    </DetailCard>
  )
}
