'use client'

import ActionButtons from '@/components/ui/ActionButtons'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import {
  formatApiDateLong,
  formatApiDateShort,
  normalizeApiDate,
  toIsoDate,
} from '@/lib/date-utils'
import type { Holiday } from '@/lib/timegate/types'
import { useMemo, useState } from 'react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

const dayPickerClassNames = {
  root: 'rdp-root text-xs w-full',
  months: 'w-full',
  month: 'w-full',
  month_grid: 'w-full border-collapse',
  weekdays: 'text-[10px] text-gray-500 dark:text-neutral-400',
  weekday: 'w-7 font-medium pb-1',
  week: 'mt-0.5',
  day: 'w-7 h-7 p-0 text-center',
  day_button:
    'size-7 rounded-md text-xs hover:bg-orange-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/40',
  outside: 'text-gray-300 dark:text-neutral-600 opacity-60',
  disabled: 'opacity-30 pointer-events-none',
  today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-primary/40',
}

type HolidayCalendarProps = {
  year: number
  holidays: Holiday[]
  loading?: boolean
  onYearChange: (year: number) => void
  onDelete?: (holiday: Holiday) => void
}

function HolidayDayButton({
  holidayMap,
  ...props
}: DayButtonProps & { holidayMap: Map<string, Holiday> }) {
  const iso = toIsoDate(props.day.date)
  const holiday = holidayMap.get(iso)
  return (
    <button
      {...props}
      type="button"
      title={holiday?.name}
      className={`${props.className ?? ''} ${holiday ? 'bg-primary/15 text-primary font-semibold hover:bg-primary/25' : ''}`}
    />
  )
}

export default function HolidayCalendar({
  year,
  holidays,
  loading,
  onYearChange,
  onDelete,
}: HolidayCalendarProps) {
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null)

  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>()
    for (const holiday of holidays) {
      const iso = normalizeApiDate(holiday.date)
      if (iso) map.set(iso, holiday)
    }
    return map
  }, [holidays])

  const sortedHolidays = useMemo(
    () =>
      [...holidays].sort((a, b) => {
        const da = normalizeApiDate(a.date)
        const db = normalizeApiDate(b.date)
        return da.localeCompare(db)
      }),
    [holidays],
  )

  function handleDayClick(date: Date) {
    const holiday = holidayMap.get(toIsoDate(date))
    setSelectedHoliday(holiday ?? null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="py-2.5 px-4 inline-flex items-center rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Année précédente"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span className="min-w-20 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {year}
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className="py-2.5 px-4 inline-flex items-center rounded-lg text-sm text-gray-700 hover:bg-gray-50 bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Année suivante"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button
            type="button"
            onClick={() => onYearChange(new Date().getFullYear())}
            className="py-2 px-3 text-sm rounded-lg bg-black/10 dark:bg-white/10 text-gray-600 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Aujourd&apos;hui
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          {loading ? (
            <SkeletonBlock className="inline-block h-3 w-36 rounded-full align-middle" />
          ) : (
            `${sortedHolidays.length} jour(s) férié(s)`
          )}
        </p>
      </div>

      <div className="rounded-xl p-4 md:p-6 tg-card">
        <div className="mb-4 flex items-center gap-3 text-xs text-gray-600 dark:text-neutral-400">
          <span className="inline-flex size-4 rounded-md bg-primary/15 border border-primary/30" />
          Jour férié — cliquez sur une date surlignée pour voir le détail
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {MONTH_NAMES.map((monthName, monthIndex) => (
            <div
              key={monthName}
              className="rounded-lg border border-slate-200/80 bg-gray-50/60 p-3 dark:border-border-dark dark:bg-neutral-800/40"
            >
              <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-neutral-200 capitalize">
                {monthName}
              </p>
              {loading ? (
                <div className="grid grid-cols-7 gap-1" aria-hidden>
                  {Array.from({ length: 35 }).map((_, i) => (
                    <SkeletonBlock key={i} className="size-7 rounded-md" />
                  ))}
                </div>
              ) : (
                <DayPicker
                month={new Date(year, monthIndex, 1)}
                disableNavigation
                locale={fr}
                showOutsideDays
                weekStartsOn={1}
                modifiers={{
                  holiday: (date) => holidayMap.has(toIsoDate(date)),
                }}
                onDayClick={handleDayClick}
                classNames={dayPickerClassNames}
                components={{
                  DayButton: (props) => <HolidayDayButton {...props} holidayMap={holidayMap} />,
                }}
              />
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedHoliday && (
        <div className="rounded-xl border border-primary/20 bg-orange-50/60 p-4 dark:bg-orange-900/10 dark:border-orange-800/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {selectedHoliday.name}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                {formatApiDateLong(selectedHoliday.date)}
              </p>
              {selectedHoliday.holidayListName && (
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-500">
                  Liste : {selectedHoliday.holidayListName}
                </p>
              )}
            </div>
            <ActionButtons
              editHref={`/holidays/${selectedHoliday.id}/edit`}
              onDelete={
                onDelete
                  ? () => {
                      onDelete(selectedHoliday)
                      setSelectedHoliday(null)
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      <div className="tg-card">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
            Liste {year}
          </h3>
        </div>
        {sortedHolidays.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 dark:text-neutral-400">
            Aucun jour férié enregistré pour cette année.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
            {sortedHolidays.map((holiday) => {
              const dateLabel = formatApiDateShort(holiday.date)
              return (
                <li
                  key={holiday.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    selectedHoliday?.id === holiday.id ? 'bg-orange-50/70 dark:bg-orange-900/10' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedHoliday(holiday)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {holiday.name}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-neutral-400 capitalize">
                      {dateLabel}
                    </span>
                  </button>
                  <ActionButtons
                    editHref={`/holidays/${holiday.id}/edit`}
                    onDelete={onDelete ? () => onDelete(holiday) : undefined}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
