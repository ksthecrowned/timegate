'use client'

import { formatDisplayDate } from '@/lib/date-utils'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'react-day-picker/locale'

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const fieldClass =
  'py-3 px-4 block w-full border border-slate-200/80 rounded-lg text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600 cursor-pointer'

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
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const errorClass = error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''

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
          className={`${fieldClass} pe-20 ${errorClass}`}
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
            className="absolute end-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"
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
          className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary disabled:opacity-50"
          aria-label="Ouvrir le calendrier"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
          className="absolute z-60 mt-1 p-3 bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-neutral-900 dark:border-neutral-700"
          role="dialog"
        >
          <DayPicker
            mode="single"
            locale={fr}
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
              month_caption: 'flex justify-center items-center font-semibold text-gray-800 dark:text-white mb-2 capitalize',
              nav: 'flex items-center justify-between absolute -inset-x-3 top-3',
              button_previous: 'p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300',
              button_next: 'p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300',
              weekdays: 'text-xs text-gray-500 dark:text-neutral-400',
              weekday: 'w-9 font-medium',
              day: 'w-9 h-9 text-sm',
              day_button:
                'w-9 h-9 rounded-lg hover:bg-orange-50 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary',
              selected:
                '[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-secondary [&>button]:font-semibold',
              today: '[&>button]:font-bold [&>button]:text-primary',
              outside: 'text-gray-300 dark:text-neutral-600',
              disabled: 'opacity-40 pointer-events-none',
            }}
          />
        </div>
      )}
    </div>
  )
}
