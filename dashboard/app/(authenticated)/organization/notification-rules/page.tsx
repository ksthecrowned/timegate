'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import {
  listNotificationRules,
  updateNotificationRule,
} from '@/lib/timegate/notification-rules'
import type { NotificationRule } from '@/lib/timegate/types'

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

  async function toggle(rule: NotificationRule, key: keyof NotificationRule) {
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
          { label: 'Règles notifications' },
        ]}
      />
      <ApiErrorBanner message={error} />

      <FormCard
        title="NotificationRule par tenant"
        hint="Contrôle par type de notification: inbox, push et email."
      >
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-neutral-800">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Inbox</th>
                  <th className="py-2 pr-3">Push</th>
                  <th className="py-2">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rule) => (
                  <tr
                    key={rule.type}
                    className="border-b border-slate-100 dark:border-neutral-900"
                  >
                    <td className="py-2 pr-3 font-mono">{rule.type}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={rule.inAppEnabled}
                        disabled={savingType === rule.type}
                        onChange={() => void toggle(rule, 'inAppEnabled')}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={rule.pushEnabled}
                        disabled={savingType === rule.type}
                        onChange={() => void toggle(rule, 'pushEnabled')}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={rule.emailEnabled}
                        disabled={savingType === rule.type}
                        onChange={() => void toggle(rule, 'emailEnabled')}
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
