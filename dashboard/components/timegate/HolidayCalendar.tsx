'use client'

import ActionButtons from '@/components/ui/ActionButtons'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { formatApiDateLong, formatApiDateShort, normalizeApiDate, toIsoDate } from '@/lib/date-utils'
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
  weekdays: 'text-[10px] text-slate-500 dark:text-slate-400',
  weekday: 'w-7 font-medium pb-1',
  week: 'mt-0.5',
  day: 'w-7 h-7 p-0 text-center',
  day_button:
    'size-7 rounded-md text-xs text-slate-700 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-slate-200 dark:hover:bg-primary/15',
  outside: 'text-slate-300 dark:text-slate-600 opacity-60',
  disabled: 'opacity-30 pointer-events-none',
  today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-primary/40',
}

const navBtnClass =
  'inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-primary/10 hover:text-primary focus:outline-none dark:bg-surface-elevated-dark dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-accent'

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
      className={`${props.className ?? ''} ${
        holiday ? 'bg-primary/15 font-semibold text-primary hover:bg-primary/25' : ''
      }`}
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
            className={`${navBtnClass} px-4 py-2.5`}
            aria-label="Année précédente"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span className="min-w-20 text-center text-lg font-semibold text-slate-900 dark:text-white">
            {year}
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className={`${navBtnClass} px-4 py-2.5`}
            aria-label="Année suivante"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button
            type="button"
            onClick={() => onYearChange(new Date().getFullYear())}
            className={navBtnClass}
          >
            Aujourd&apos;hui
          </button>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {loading ? (
            <SkeletonBlock className="inline-block h-3 w-36 rounded-full align-middle" />
          ) : (
            `${sortedHolidays.length} jour(s) férié(s)`
          )}
        </div>
      </div>

      <div className="rounded-xl p-4 md:p-6 tg-card">
        <div className="mb-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex size-4 rounded-md border border-primary/30 bg-primary/15" />
          Jour férié — cliquez sur une date surlignée pour voir le détail
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {MONTH_NAMES.map((monthName, monthIndex) => (
            <div
              key={monthName}
              className="rounded-lg border border-slate-200/80 bg-surface p-3 dark:border-border-dark dark:bg-surface-elevated-dark/40"
            >
              <p className="mb-2 text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
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
                    DayButton: (props) => (
                      <HolidayDayButton {...props} holidayMap={holidayMap} />
                    ),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedHoliday ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedHoliday.name}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {formatApiDateLong(selectedHoliday.date)}
              </p>
              {selectedHoliday.holidayListName ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Liste : {selectedHoliday.holidayListName}
                </p>
              ) : null}
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
      ) : null}

      <div className="tg-card">
        <div className="border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Liste {year}
          </h3>
        </div>
        {sortedHolidays.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
            Aucun jour férié enregistré pour cette année.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-border-dark">
            {sortedHolidays.map((holiday) => {
              const dateLabel = formatApiDateShort(holiday.date)
              return (
                <li
                  key={holiday.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    selectedHoliday?.id === holiday.id
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedHoliday(holiday)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {holiday.name}
                    </span>
                    <span className="block text-xs capitalize text-slate-500 dark:text-slate-400">
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
