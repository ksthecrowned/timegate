'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import FormTabs, { type FormTabItem } from '@/components/ui/FormTabs'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { Switcher } from '@/components/ui/Switcher'
import { HttpError } from '@/lib/http'
import {
  notificationRuleGroups,
  notificationTypeGroup,
  notificationTypeLabel,
  type NotificationRuleGroupId,
} from '@/lib/timegate/notification-labels'
import {
  listNotificationRules,
  updateNotificationRule,
} from '@/lib/timegate/notification-rules'
import type { NotificationRule } from '@/lib/timegate/types'

type ChannelKey = 'inAppEnabled' | 'pushEnabled' | 'emailEnabled'

const CHANNELS: { key: ChannelKey; label: string; short: string }[] = [
  { key: 'inAppEnabled', label: 'Alertes in-app', short: 'In-app' },
  { key: 'pushEnabled', label: 'Push', short: 'Push' },
  { key: 'emailEnabled', label: 'E-mail', short: 'E-mail' },
]

function RulesSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="flex gap-2 border-b border-slate-200/80 pb-3 dark:border-border-dark">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200/80 px-3 py-3 dark:border-border-dark"
          >
            <SkeletonBlock className="h-4 w-40 rounded-full sm:w-56" />
            <div className="flex gap-4">
              <SkeletonBlock className="h-5 w-9 rounded-full" />
              <SkeletonBlock className="h-5 w-9 rounded-full" />
              <SkeletonBlock className="h-5 w-9 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RulesGroupPanel({
  rules,
  savingType,
  onToggle,
}: {
  rules: NotificationRule[]
  savingType: string | null
  onToggle: (rule: NotificationRule, key: ChannelKey) => void
}) {
  return (
    <>
      <ul className="space-y-2 sm:hidden">
        {rules.map((rule) => (
          <li
            key={rule.type}
            className="rounded-lg border border-slate-200/80 px-3 py-3 dark:border-border-dark"
          >
            <p className="mb-3 text-sm font-medium text-slate-900 dark:text-white">
              {notificationTypeLabel(rule.type)}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map((channel) => (
                <div key={channel.key} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {channel.short}
                  </span>
                  <Switcher
                    size="sm"
                    checked={rule[channel.key]}
                    disabled={savingType === rule.type}
                    onCheckedChange={() => onToggle(rule, channel.key)}
                    aria-label={`${channel.label} — ${notificationTypeLabel(rule.type)}`}
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200/80 dark:border-border-dark">
              <th className="py-2.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                Événement
              </th>
              {CHANNELS.map((channel) => (
                <th
                  key={channel.key}
                  className="py-2.5 pr-4 font-semibold text-slate-700 last:pr-0 dark:text-slate-200"
                >
                  {channel.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr
                key={rule.type}
                className="border-b border-slate-200/80 dark:border-border-dark"
              >
                <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                  {notificationTypeLabel(rule.type)}
                </td>
                {CHANNELS.map((channel) => (
                  <td key={channel.key} className="py-3 pr-4 last:pr-0">
                    <Switcher
                      size="sm"
                      checked={rule[channel.key]}
                      disabled={savingType === rule.type}
                      onCheckedChange={() => onToggle(rule, channel.key)}
                      aria-label={`${channel.label} — ${notificationTypeLabel(rule.type)}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function NotificationRulesPage() {
  const [rows, setRows] = useState<NotificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<NotificationRuleGroupId>('punch')

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

  const grouped = useMemo(() => {
    const byGroup = new Map<string, NotificationRule[]>()
    for (const rule of rows) {
      const groupId = notificationTypeGroup(rule.type)
      const list = byGroup.get(groupId) ?? []
      list.push(rule)
      byGroup.set(groupId, list)
    }
    return notificationRuleGroups()
      .map((group) => ({
        ...group,
        rules: (byGroup.get(group.id) ?? []).sort((a, b) =>
          notificationTypeLabel(a.type).localeCompare(notificationTypeLabel(b.type), 'fr'),
        ),
      }))
      .filter((group) => group.rules.length > 0)
  }, [rows])

  useEffect(() => {
    if (grouped.length === 0) return
    if (!grouped.some((group) => group.id === activeTab)) {
      setActiveTab(grouped[0].id)
    }
  }, [grouped, activeTab])

  const toggle = useCallback(async (rule: NotificationRule, key: ChannelKey) => {
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
  }, [])

  const tabs: FormTabItem[] = useMemo(
    () =>
      grouped.map((group) => ({
        id: group.id,
        label: `${group.label} (${group.rules.length})`,
        content: (
          <RulesGroupPanel
            rules={group.rules}
            savingType={savingType}
            onToggle={(rule, key) => void toggle(rule, key)}
          />
        ),
      })),
    [grouped, savingType, toggle],
  )

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration organisation', href: '/organization' },
          { label: 'Règles d’alertes' },
        ]}
      />

      <ApiErrorBanner message={error} />

      <FormCard
        title="Règles d’alertes"
        hint="Activez ou désactivez chaque canal (in-app, push, e-mail) par type d’événement."
      >
        {loading ? (
          <RulesSkeleton />
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune règle configurée.</p>
        ) : (
          <FormTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as NotificationRuleGroupId)}
          />
        )}
      </FormCard>
    </div>
  )
}
