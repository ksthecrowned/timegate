'use client'

import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const baseChartOptions: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
  dataLabels: { enabled: false },
  grid: { borderColor: '#f3f4f6' },
  tooltip: { theme: 'light' },
}

type LineSeries = { name: string; data: number[] }

export function LineChart({
  series,
  categories,
}: {
  series: LineSeries[]
  categories: string[]
}) {
  return (
    <ReactApexChart
      type="area"
      height={300}
      series={series}
      options={{
        ...baseChartOptions,
        colors: ['#f97316', '#ef4444'],
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
        xaxis: { categories },
        legend: { position: 'top', horizontalAlign: 'right' },
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
  return (
    <ReactApexChart
      type="donut"
      height={300}
      series={series}
      options={{
        ...baseChartOptions,
        labels,
        colors: ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#a855f7', '#64748b'],
        legend: { position: 'bottom' },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total',
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
  return (
    <ReactApexChart
      type="bar"
      height={300}
      series={series}
      options={{
        ...baseChartOptions,
        colors: ['#f97316', '#ef4444', '#3b82f6'],
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: stacked ? '55%' : '45%',
          },
        },
        xaxis: { categories },
        legend: { position: 'top', horizontalAlign: 'right' },
        ...(stacked ? { chart: { ...baseChartOptions.chart, stacked: true } } : {}),
      }}
    />
  )
}
