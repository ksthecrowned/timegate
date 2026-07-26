'use client'

import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { Switcher } from '@/components/ui/Switcher'
import { HttpError } from '@/lib/http'
import { notificationTypeLabel } from '@/lib/timegate/notification-labels'
import {
  listNotificationRules,
  updateNotificationRule,
} from '@/lib/timegate/notification-rules'
import type { NotificationRule } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

type ChannelKey = 'inAppEnabled' | 'pushEnabled' | 'emailEnabled'

export default function NotificationRulesPage() {
  const [rows, setRows] = useState<NotificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listNotificationRules()
      setRows(data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle(rule: NotificationRule, key: ChannelKey) {
    const next = !Boolean(rule[key])
    setSavingType(rule.type)
    setError('')
    try {
      const updated = await updateNotificationRule(rule.type, { [key]: next })
      setRows((prev) => prev.map((row) => (row.type === updated.type ? updated : row)))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible')
    } finally {
      setSavingType(null)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration organisation', href: '/organization' },
          { label: 'Règles d’alertes' },
        ]}
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Canaux d&apos;alerte (in-app, push, e-mail) par type d&apos;événement — distinct de
        l&apos;inbox manager « Boite de réception ».
      </p>
      <ApiErrorBanner message={error} />

      <FormCard
        title="Règles d’alertes"
        hint="Activez ou désactivez chaque canal (alertes in-app, push, e-mail) par type d’événement."
      >
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200/80 dark:border-border-dark">
                  <th className="py-2.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                    Événement
                  </th>
                  <th className="py-2.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                    Alertes in-app
                  </th>
                  <th className="py-2.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                    Push
                  </th>
                  <th className="py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                    E-mail
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rule) => (
                  <tr
                    key={rule.type}
                    className="border-b border-slate-100 dark:border-neutral-900"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {notificationTypeLabel(rule.type)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {rule.type}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Switcher
                        size="sm"
                        checked={rule.inAppEnabled}
                        disabled={savingType === rule.type}
                        onCheckedChange={() => void toggle(rule, 'inAppEnabled')}
                        aria-label={`Alertes in-app — ${notificationTypeLabel(rule.type)}`}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Switcher
                        size="sm"
                        checked={rule.pushEnabled}
                        disabled={savingType === rule.type}
                        onCheckedChange={() => void toggle(rule, 'pushEnabled')}
                        aria-label={`Push — ${notificationTypeLabel(rule.type)}`}
                      />
                    </td>
                    <td className="py-3">
                      <Switcher
                        size="sm"
                        checked={rule.emailEnabled}
                        disabled={savingType === rule.type}
                        onCheckedChange={() => void toggle(rule, 'emailEnabled')}
                        aria-label={`E-mail — ${notificationTypeLabel(rule.type)}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  )
}
