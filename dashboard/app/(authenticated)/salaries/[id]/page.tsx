'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import StatusBadge from '@/components/ui/StatusBadge'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteSalary, getSalary } from '@/lib/timegate/salaries'
import type { Salary } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

import { employeeDisplayName } from '@/lib/timegate/employee-display'

function employeeLabel(row: Salary): string {
  return employeeDisplayName(row.employee)
}

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SalaryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Salary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getSalary(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Salaire introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Salaires', href: '/salaries' },
          { label: row ? employeeLabel(row) : 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/salaries/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteSalary(id).then(() => router.push('/salaries'))
                }}
              />
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <DetailCard title="Salaire">
          <DetailRow label="Employé" value={employeeLabel(row)} />
          <DetailRow label="Période" value={`${row.month}/${row.year}`} />
          <DetailRow label="Salaire de base" value={formatMoney(row.baseSalary)} />
          <DetailRow label="Primes" value={formatMoney(row.bonuses)} />
          <DetailRow label="Déductions" value={formatMoney(row.deductions)} />
          <DetailRow label="Net" value={formatMoney(row.netSalary)} />
          <DetailRow
            label="Statut"
            value={<StatusBadge status={row.status === 'PAID' ? 'paid' : 'pending'} />}
          />
          <DetailRow
            label="Payé le"
            value={row.paidAt ? new Date(row.paidAt).toLocaleString('fr-FR') : '—'}
          />
          <DetailRow label="Notes" value={row.notes ?? '—'} />
          <DetailRow
            label="Créé le"
            value={new Date(row.createdAt).toLocaleString('fr-FR')}
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
