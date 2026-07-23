'use client'

import { useCallback, useId, useState } from 'react'

const btnClass =
  'size-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-xs hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 dark:focus:bg-neutral-800'

const inputClass =
  'w-full p-0 bg-transparent border-0 text-gray-800 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500'

function parseNum(value: string): number {
  const n = parseFloat(value)
  return Number.isNaN(n) ? 0 : n
}

function sanitizeInput(raw: string): string {
  if (raw === '' || raw === '-') return raw
  return raw.replace(/^0+(?=\d)/, '') || '0'
}

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value?: number | string
  /** Valeur numérique parsée. */
  onChange?: (value: number) => void
  /** Valeur brute (string) — utile avec un state formulaire string. */
  onValueChange?: (value: string) => void
  error?: boolean
  wrapperClassName?: string
}

export function NumberInput({
  value,
  onChange,
  onValueChange,
  error,
  min,
  max,
  step = 1,
  disabled,
  className = '',
  wrapperClassName = '',
  id: idProp,
  ...props
}: NumberInputProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [internal, setInternal] = useState('')
  const display = value !== undefined && value !== null ? String(value) : internal

  const emit = useCallback(
    (raw: string) => {
      if (value === undefined) setInternal(raw)
      onValueChange?.(raw)
      if (raw !== '' && raw !== '-') onChange?.(parseNum(raw))
    },
    [onChange, onValueChange, value],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit(sanitizeInput(e.target.value))
  }

  const applyStep = (delta: number) => {
    if (disabled) return
    let next = parseNum(display) + delta
    if (min !== undefined) next = Math.max(Number(min), next)
    if (max !== undefined) next = Math.min(Number(max), next)
    emit(String(next))
  }

  const current = parseNum(display)
  const minNum = min !== undefined ? Number(min) : undefined
  const maxNum = max !== undefined ? Number(max) : undefined
  const stepNum = Number(step) || 1

  return (
    <div
      className={`py-2 px-3 bg-surface border border-slate-200/80 rounded-lg dark:bg-surface-dark dark:border-border-dark ${
        error ? 'border-red-400' : ''
      } ${wrapperClassName}`}
      data-hs-input-number=""
    >
      <div className="w-full flex justify-between items-center gap-x-3">
        <input
          {...props}
          id={id}
          type="number"
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={display}
          onChange={handleChange}
          className={`${inputClass} ${className}`}
          style={{ MozAppearance: 'textfield' }}
        />
        <div className="flex justify-end items-center gap-x-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Diminuer"
            data-hs-input-number-decrement=""
            className={btnClass}
            disabled={disabled || (minNum !== undefined && current <= minNum)}
            onClick={() => applyStep(-stepNum)}
          >
            <svg
              className="shrink-0 size-3.5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Augmenter"
            data-hs-input-number-increment=""
            className={btnClass}
            disabled={disabled || (maxNum !== undefined && current >= maxNum)}
            onClick={() => applyStep(stepNum)}
          >
            <svg
              className="shrink-0 size-3.5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
