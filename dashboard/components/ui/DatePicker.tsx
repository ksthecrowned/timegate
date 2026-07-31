'use client'

import { formatDisplayDate } from '@/lib/date-utils'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  id?: string
  fromYear?: number
  toYear?: number
  /** `toolbar` : hauteur réduite pour barres d’outils (filtres). */
  variant?: 'default' | 'toolbar'
}

export function DatePicker({
  value = null,
  onChange,
  placeholder = 'Sélectionner une date',
  error,
  disabled,
  minDate,
  maxDate,
  className = '',
  id,
  fromYear,
  toYear,
  variant = 'default',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentYear = new Date().getFullYear()
  const resolvedFromYear = fromYear ?? Math.max(1950, currentYear - 80)
  const resolvedToYear = toYear ?? currentYear + 20
  const isToolbar = variant === 'toolbar'

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const fieldClass = cn(
    'block w-full border rounded-lg text-sm bg-surface cursor-pointer',
    'focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none',
    'dark:bg-surface-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600',
    isToolbar
      ? 'py-2 px-2.5 pe-16 border-slate-200/80'
      : 'py-3 px-4 pe-20 border-slate-200/80',
    error && 'border-red-400 focus:border-red-400 focus:ring-red-400',
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          readOnly
          disabled={disabled}
          value={formatDisplayDate(value)}
          placeholder={placeholder}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={fieldClass}
          aria-haspopup="dialog"
          aria-expanded={open}
        />
        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(null)
            }}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400',
              isToolbar ? 'end-8' : 'end-10',
            )}
            aria-label="Effacer la date"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-primary disabled:opacity-50 dark:text-slate-500 dark:hover:text-teal-300',
            isToolbar ? 'end-2.5' : 'end-3',
          )}
          aria-label="Ouvrir le calendrier"
        >
          <svg
            className={isToolbar ? 'size-4' : 'size-5'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute z-60 mt-1 rounded-xl border border-slate-200/80 bg-surface-card p-3 shadow-lg dark:border-border-dark dark:bg-surface-card-dark"
          role="dialog"
        >
          <DayPicker
            mode="single"
            locale={fr}
            captionLayout="dropdown-years"
            startMonth={new Date(resolvedFromYear, 0)}
            endMonth={new Date(resolvedToYear, 11)}
            selected={value ?? undefined}
            onSelect={(date) => {
              onChange?.(date ?? null)
              if (date) setOpen(false)
            }}
            disabled={(date) => {
              const day = stripTime(date)
              if (minDate && day < stripTime(minDate)) return true
              if (maxDate && day > stripTime(maxDate)) return true
              return false
            }}
            classNames={{
              root: 'rdp-root text-sm',
              month_caption:
                'relative mb-2 flex items-center justify-center font-semibold capitalize text-slate-800 dark:text-slate-100',
              dropdowns: 'rdp-dropdowns flex items-center justify-center gap-1.5',
              dropdown_root: 'rdp-dropdown_root',
              dropdown: 'rdp-dropdown',
              years_dropdown: 'rdp-years_dropdown',
              months_dropdown: 'rdp-months_dropdown',
              caption_label: 'rdp-caption_label',
              chevron: 'rdp-chevron',
              nav: 'absolute -inset-x-3 top-3 flex items-center justify-between',
              button_previous:
                'rounded-md p-1 text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/15 dark:hover:text-teal-300',
              button_next:
                'rounded-md p-1 text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/15 dark:hover:text-teal-300',
              weekdays: 'text-xs text-slate-500 dark:text-slate-400',
              weekday: 'w-9 font-medium',
              day: 'w-9 h-9 text-sm',
              day_button:
                'h-9 w-9 rounded-lg text-slate-800 hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300',
              selected:
                '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-white [&>button]:hover:bg-primary',
              today: '[&>button]:font-bold [&>button]:text-primary',
              outside: 'text-slate-300 dark:text-slate-600',
              disabled: 'pointer-events-none opacity-40',
            }}
          />
        </div>
      )}
    </div>
  )
}
