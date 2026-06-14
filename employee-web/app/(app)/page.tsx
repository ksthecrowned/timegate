'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getEmployeeMe, getMyLeaveBalances, listEmployeeLeaves } from '@/lib/api'
import type { EmployeeLeaveBalances, EmployeeProfile } from '@/lib/types'
import { ErrorBanner, MobileCard } from '@/components/ui'

const leaveStatusLabel: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
}

export default function HomePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [balances, setBalances] = useState<EmployeeLeaveBalances | null>(null)
  const [recentLeaves, setRecentLeaves] = useState<
    Awaited<ReturnType<typeof listEmployeeLeaves>>['data']
  >([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([getEmployeeMe(), getMyLeaveBalances(), listEmployeeLeaves({ limit: 5 })])
      .then(([me, balanceData, leaves]) => {
        setProfile(me)
        setBalances(balanceData)
        setRecentLeaves(leaves.data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      {profile && (
        <MobileCard title={`Bonjour ${profile.firstName}`}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Branche</dt>
              <dd className="text-right">{profile.branchName ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Horaire</dt>
              <dd className="text-right">{profile.defaultShiftName ?? '—'}</dd>
            </div>
          </dl>
        </MobileCard>
      )}

      {balances && (
        <MobileCard title={`Soldes congés ${balances.year}`}>
          <dl className="space-y-3">
            {balances.balances.map((balance) => (
              <div
                key={balance.leaveTypeId}
                className="flex items-start justify-between gap-3 border-t border-white/8 pt-3 first:border-0 first:pt-0"
              >
                <dt className="text-sm font-medium">{balance.leaveTypeName}</dt>
                <dd className="text-right text-xs text-text-muted">
                  {balance.unlimited
                    ? 'Illimité'
                    : `${balance.remaining ?? 0} restant(s)`}
                </dd>
              </div>
            ))}
          </dl>
        </MobileCard>
      )}

      <MobileCard title="Dernières demandes">
        {recentLeaves.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune demande de congé.</p>
        ) : (
          <ul className="space-y-3">
            {recentLeaves.map((leave) => (
              <li
                key={leave.id}
                className="border-t border-white/8 pt-3 text-sm first:border-0 first:pt-0"
              >
                <p>
                  {leave.startDate?.slice(0, 10)} → {leave.endDate?.slice(0, 10)}
                </p>
                <p className="text-xs text-text-muted">
                  {leaveStatusLabel[leave.status] ?? leave.status}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/leaves"
          className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline"
        >
          Gérer mes congés →
        </Link>
      </MobileCard>
    </div>
  )
}
