'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import { getPlatformStats, type PlatformStats } from '@/lib/timegate/platform-stats'

function PlatformStatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: string
  accent?: string
}) {
  return (
    <div className="flex flex-col tg-card shadow-2xs">
      <div className="p-4 md:px-5 md:py-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase text-gray-500 dark:text-neutral-500">{label}</p>
          <i className={`${icon} ${accent ?? 'text-primary'}`} />
        </div>
        <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-neutral-200">
          {value.toLocaleString('fr-FR')}
        </h3>
      </div>
    </div>
  )
}

export default function PlatformDashboard() {
  const [data, setData] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getPlatformStats())
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) return <SkeletonDashboard />

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <PlatformStatCard
              label="Organisations"
              value={data.summary.organizationCount}
              icon="fa-solid fa-building"
            />
            <PlatformStatCard
              label="Abonnements actifs"
              value={data.summary.activeSubscriptions}
              icon="fa-solid fa-credit-card"
              accent="text-green-500"
            />
            <PlatformStatCard
              label="Abonnements expirés"
              value={data.summary.expiredSubscriptions}
              icon="fa-solid fa-clock"
              accent="text-amber-500"
            />
            <PlatformStatCard
              label="Pointages (30 j)"
              value={data.summary.attendanceEventsLast30Days}
              icon="fa-solid fa-fingerprint"
              accent="text-blue-500"
            />
          </div>

          <div className="bg-white border border-gray-200 shadow-2xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Organisations (statistiques)
              </h2>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                Compteurs agrégés uniquement — pas d&apos;accès aux données opérationnelles.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-900">
                  <tr>
                    {['Organisation', 'SKU', 'Employés', 'Branches', 'Kiosques', 'Abonnement'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-neutral-400"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {data.organizations.map((org) => (
                    <tr key={org.companyId} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-neutral-200">
                        {org.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-neutral-400">{org.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-neutral-400">
                        {org.employeeCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-neutral-400">
                        {org.branchCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-neutral-400">
                        {org.kioskCount}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            org.subscriptionActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {org.subscriptionActive
                            ? (org.subscriptionPlan ?? 'Actif')
                            : 'Expiré'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-2xs rounded-xl dark:bg-neutral-800 dark:border-neutral-700 p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Accès rapide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/super-admin/organizations', label: 'Organisations', icon: 'fa-building' },
                { href: '/subscriptions', label: 'Abonnements', icon: 'fa-credit-card' },
                { href: '/audit-logs', label: 'Audit', icon: 'fa-clipboard-list' },
                { href: '/system-config', label: 'Config', icon: 'fa-sliders' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-primary hover:text-primary dark:border-neutral-700 text-sm gap-2"
                >
                  <i className={`fa-solid ${item.icon} text-lg`} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
