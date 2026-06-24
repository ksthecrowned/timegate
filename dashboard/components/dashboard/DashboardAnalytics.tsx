'use client'

import { BarChart, DonutChart, LineChart } from '@/components/dashboard/Charts'
import type { DashboardChartData } from '@/lib/timegate/dashboard-stats'

type DashboardAnalyticsProps = {
  data: DashboardChartData
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="tg-card shadow-2xs p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500 dark:border-neutral-700 dark:text-neutral-400">
      {message}
    </div>
  )
}

export default function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const hasTrend = data.attendanceTrend.present.some((v) => v > 0)
  const hasStatus = data.statusBreakdown.length > 0
  const hasHours = data.weeklyHours.worked.some((v) => v > 0)
  const hasIncidents =
    data.weeklyIncidents.late.some((v) => v > 0) ||
    data.weeklyIncidents.absent.some((v) => v > 0)

  const hasPlanning =
    (data.planningVsActual?.byWeek.some((w) => w.plannedMinutes > 0 || w.workedMinutes > 0) ??
      false)

  return (
    <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
      <ChartCard title="Présence quotidienne" subtitle="14 derniers jours">
        {hasTrend ? (
          <LineChart
            categories={data.attendanceTrend.categories}
            series={[
              { name: 'Présents', data: data.attendanceTrend.present },
              { name: 'Absents', data: data.attendanceTrend.absent },
            ]}
          />
        ) : (
          <EmptyChart message="Aucune donnée de présence sur la période." />
        )}
      </ChartCard>

      <ChartCard title="Répartition des statuts" subtitle="30 derniers jours">
        {hasStatus ? (
          <DonutChart
            labels={data.statusBreakdown.map((s) => s.label)}
            series={data.statusBreakdown.map((s) => s.value)}
          />
        ) : (
          <EmptyChart message="Aucun jour de présence enregistré." />
        )}
      </ChartCard>

      <ChartCard title="Heures travaillées" subtitle="Par semaine (30 jours)">
        {hasHours ? (
          <BarChart
            categories={data.weeklyHours.categories}
            series={[{ name: 'Heures', data: data.weeklyHours.worked }]}
          />
        ) : (
          <EmptyChart message="Aucune feuille de temps sur la période." />
        )}
      </ChartCard>

      <ChartCard title="Retards & absences" subtitle="Par semaine (30 jours)">
        {hasIncidents ? (
          <BarChart
            stacked
            categories={data.weeklyIncidents.categories}
            series={[
              { name: 'Retards', data: data.weeklyIncidents.late },
              { name: 'Absences', data: data.weeklyIncidents.absent },
            ]}
          />
        ) : (
          <EmptyChart message="Aucun retard ni absence sur la période." />
        )}
      </ChartCard>

      <ChartCard title="Prévu vs réalisé" subtitle="Minutes planifiées vs travaillées (30 jours)">
        {hasPlanning && data.planningVsActual ? (
          <BarChart
            categories={data.planningVsActual.byWeek.map((w) => w.label)}
            series={[
              {
                name: 'Prévu (h)',
                data: data.planningVsActual.byWeek.map((w) =>
                  Math.round((w.plannedMinutes / 60) * 10) / 10,
                ),
              },
              {
                name: 'Réalisé (h)',
                data: data.planningVsActual.byWeek.map((w) =>
                  Math.round((w.workedMinutes / 60) * 10) / 10,
                ),
              },
            ]}
          />
        ) : (
          <EmptyChart message="Aucune donnée planning sur la période." />
        )}
      </ChartCard>
    </div>
  )
}
