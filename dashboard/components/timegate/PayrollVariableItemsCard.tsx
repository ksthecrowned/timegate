'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiErrorBanner, DetailCard, primaryBtnClass } from '@/components/timegate/ui'
import EmployeeTableCell from '@/components/timegate/EmployeeTableCell'
import PayrollVariableItemForm from '@/components/timegate/PayrollVariableItemForm'
import type { SelectOption } from '@/components/ui/select-search-types'
import type { EmployeeSummary } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import {
  createPayrollVariableItem,
  deletePayrollVariableItem,
  listPayrollVariableItems,
  type PayrollVariableItem,
} from '@/lib/timegate/payroll-variable-items'

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const KIND_LABELS: Record<string, string> = {
  ALLOWANCE: 'Indemnité',
  DEDUCTION: 'Retenue',
}

type Props = {
  runId: string
  employeeOptions: SelectOption[]
  employeesById: Map<string, EmployeeSummary | null | undefined>
}

export default function PayrollVariableItemsCard({ runId, employeeOptions, employeesById }: Props) {
  const [items, setItems] = useState<PayrollVariableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listPayrollVariableItems(runId)
      setItems(data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger les éléments variables.')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string) {
    setError('')
    try {
      await deletePayrollVariableItem(runId, id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Suppression impossible.')
    }
  }

  return (
    <DetailCard
      title="Éléments variables"
      actions={
        <button
          type="button"
          className={primaryBtnClass}
          onClick={() => setShowCreate((prev) => !prev)}
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
          <PayrollVariableItemForm
            employeeOptions={employeeOptions}
            submitLabel="Créer"
            onCancel={() => setShowCreate(false)}
            onSubmit={async (values) => {
              await createPayrollVariableItem(runId, values)
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
          Aucun élément variable pour cette paie.
        </p>
      ) : (
        <div className="overflow-x-auto px-4 pb-4 md:px-5">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-3 font-semibold">Employé</th>
                <th className="py-2 pr-3 font-semibold">Libellé</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Montant</th>
                <th className="py-2 pr-3 font-semibold">Notes</th>
                <th className="py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">
                    <EmployeeTableCell employee={employeesById.get(item.employeeId) ?? null} />
                  </td>
                  <td className="py-2 pr-3">{item.label}</td>
                  <td className="py-2 pr-3">{KIND_LABELS[item.kind] ?? item.kind}</td>
                  <td className="py-2 pr-3">{formatMoney(item.amount)}</td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{item.notes || '—'}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
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
    </DetailCard>
  )
}
