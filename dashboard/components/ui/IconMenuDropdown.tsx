'use client'

import { useEffect, useRef, useState } from 'react'

export type IconMenuOption<T extends string = string> = {
  label: string
  value: T
}

type IconMenuDropdownProps<T extends string = string> = {
  options: IconMenuOption<T>[]
  value?: T | null
  onChange: (value: T) => void
  /** Classes Font Awesome, ex. `fa-solid fa-arrow-down-short-wide`. */
  icon?: string
  ariaLabel: string
  title?: string
  align?: 'left' | 'right'
  className?: string
  /** Mettre en évidence le bouton quand `value` correspond à une option. */
  highlightWhenActive?: boolean
}

export default function IconMenuDropdown<T extends string = string>({
  options,
  value,
  onChange,
  icon = 'fa-solid fa-arrow-down-short-wide',
  ariaLabel,
  title,
  align = 'right',
  className = '',
  highlightWhenActive = true,
}: IconMenuDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = Boolean(value && options.some((o) => o.value === value))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex size-9 items-center justify-center rounded-lg border text-sm transition-colors ${
          highlightWhenActive && active
            ? 'border-primary/40 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-teal-300'
            : 'border-slate-200/80 bg-surface text-slate-600 hover:bg-slate-50 dark:border-border-dark dark:bg-surface-dark dark:text-slate-300 dark:hover:bg-white/10'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
      >
        <i className={icon} />
      </button>

      {open ? (
        <div
          className={`absolute top-full z-50 mt-2 min-w-40 rounded-lg border border-slate-200/80 bg-surface-card p-1 shadow-lg dark:border-border-dark dark:bg-surface-card-dark ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          role="menu"
        >
          {options.map((option) => {
            const isActive = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 font-medium text-primary dark:bg-primary/15 dark:text-teal-300'
                    : 'text-slate-700 hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/15 dark:hover:text-teal-300'
                }`}
              >
                {option.label}
                {isActive ? (
                  <i className="fa-solid fa-check ms-auto text-xs opacity-80" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
