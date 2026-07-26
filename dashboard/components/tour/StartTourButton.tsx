'use client'

import { startProductTour } from '@/lib/product-tour'

type StartTourButtonProps = {
  className?: string
  label?: string
  /** Compact icon+text for the navbar */
  variant?: 'navbar' | 'page'
}

export default function StartTourButton({
  className,
  label = 'Start tour',
  variant = 'page',
}: StartTourButtonProps) {
  if (variant === 'navbar') {
    return (
      <button
        type="button"
        data-tour="start-tour"
        onClick={() => startProductTour({ force: true })}
        title={label}
        aria-label={label}
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 dark:bg-primary/20 dark:text-accent dark:hover:bg-primary/30'
        }
      >
        <i className="fa-solid fa-route text-[11px]" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      data-tour="start-tour"
      onClick={() => startProductTour({ force: true })}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-surface px-3 py-2 text-sm text-slate-700 hover:border-primary/40 hover:text-primary dark:border-border-dark dark:bg-surface-dark dark:text-slate-200 dark:hover:text-accent'
      }
    >
      <i className="fa-solid fa-route" aria-hidden />
      {label}
    </button>
  )
}
