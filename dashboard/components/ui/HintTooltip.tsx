'use client'

import { Info } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type HintTooltipProps = {
  text: string
  label?: string
  className?: string
}

type TooltipProps = {
  content: string
  children: ReactNode
  className?: string
  /** Preline placement, ex. `top` / `bottom`. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const tooltipContentClass =
  'hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible invisible absolute z-50 inline-block max-w-[14rem] rounded-md bg-slate-800/90 px-2 py-0.5 text-[11px] font-normal leading-snug text-slate-100 opacity-0 shadow-none transition-opacity dark:bg-slate-700/95'

function initPrelineTooltips() {
  if (typeof window === 'undefined') return
  const w = window as typeof window & {
    HSStaticMethods?: { autoInit: () => void }
    HSTooltip?: { autoInit: () => void }
  }
  w.HSTooltip?.autoInit?.() ?? w.HSStaticMethods?.autoInit?.()
}

/** Tooltip Preline autour d’un déclencheur quelconque (icônes d’action, etc.). */
export function Tooltip({
  content,
  children,
  className = '',
  placement = 'top',
}: TooltipProps) {
  useEffect(() => {
    initPrelineTooltips()
  }, [content])

  return (
    <div className={`hs-tooltip inline-flex [--placement:${placement}] ${className}`}>
      <span className="hs-tooltip-toggle inline-flex">{children}</span>
      <span className={tooltipContentClass} role="tooltip">
        {content}
      </span>
    </div>
  )
}

export function HintTooltip({ text, label = 'Aide', className = '' }: HintTooltipProps) {
  useEffect(() => {
    initPrelineTooltips()
  }, [text])

  return (
    <div className={`hs-tooltip inline-flex [--placement:top] ${className}`}>
      <button
        type="button"
        className="hs-tooltip-toggle inline-flex shrink-0 text-slate-400 hover:text-primary focus:outline-none focus:text-primary dark:text-slate-500 dark:hover:text-accent"
        aria-label={label}
      >
        <Info className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span className={tooltipContentClass} role="tooltip">
        {text}
      </span>
    </div>
  )
}
