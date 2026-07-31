'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const read = () => setIsDark(root.classList.contains('dark'))
    read()

    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

function chartTheme(isDark: boolean): ApexOptions {
  const muted = isDark ? '#94a3b8' : '#64748b'
  const border = isDark ? 'rgba(148, 163, 184, 0.2)' : '#f3f4f6'
  const label = isDark ? '#e2e8f0' : '#334155'

  return {
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
      foreColor: muted,
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: border,
      strokeDashArray: 3,
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
    },
    legend: {
      labels: { colors: muted },
    },
    xaxis: {
      labels: { style: { colors: muted } },
      axisBorder: { color: border },
      axisTicks: { color: border },
    },
    yaxis: {
      labels: { style: { colors: muted } },
    },
    theme: {
      mode: isDark ? 'dark' : 'light',
    },
    // Used by donut center label
    plotOptions: {
      pie: {
        donut: {
          labels: {
            name: { color: muted },
            value: { color: label },
            total: { color: label, label: 'Total' },
          },
        },
      },
    },
  }
}

type LineSeries = { name: string; data: number[] }

export function LineChart({
  series,
  categories,
}: {
  series: LineSeries[]
  categories: string[]
}) {
  const isDark = useIsDarkMode()
  const theme = chartTheme(isDark)

  return (
    <ReactApexChart
      key={isDark ? 'dark' : 'light'}
      type="area"
      height={300}
      series={series}
      options={{
        ...theme,
        colors: ['#f97316', '#ef4444'],
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
        xaxis: { ...theme.xaxis, categories },
        legend: { ...theme.legend, position: 'top', horizontalAlign: 'right' },
      }}
    />
  )
}

export function DonutChart({
  series,
  labels,
}: {
  series: number[]
  labels: string[]
}) {
  const isDark = useIsDarkMode()
  const theme = chartTheme(isDark)

  return (
    <ReactApexChart
      key={isDark ? 'dark' : 'light'}
      type="donut"
      height={300}
      series={series}
      options={{
        ...theme,
        labels,
        colors: ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#a855f7', '#64748b'],
        legend: { ...theme.legend, position: 'bottom' },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                name: theme.plotOptions?.pie?.donut?.labels?.name,
                value: theme.plotOptions?.pie?.donut?.labels?.value,
                total: {
                  show: true,
                  label: 'Total',
                  color: theme.plotOptions?.pie?.donut?.labels?.total?.color,
                  formatter: (w) =>
                    w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString(),
                },
              },
            },
          },
        },
      }}
    />
  )
}

export function BarChart({
  series,
  categories,
  stacked,
}: {
  series: LineSeries[]
  categories: string[]
  stacked?: boolean
}) {
  const isDark = useIsDarkMode()
  const theme = chartTheme(isDark)

  return (
    <ReactApexChart
      key={isDark ? 'dark' : 'light'}
      type="bar"
      height={300}
      series={series}
      options={{
        ...theme,
        colors: ['#f97316', '#ef4444', '#3b82f6'],
        chart: {
          ...theme.chart,
          stacked: Boolean(stacked),
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: stacked ? '55%' : '45%',
          },
        },
        xaxis: { ...theme.xaxis, categories },
        legend: { ...theme.legend, position: 'top', horizontalAlign: 'right' },
      }}
    />
  )
}
