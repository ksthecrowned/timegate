'use client'

import { Info } from 'lucide-react'
import { useEffect } from 'react'

type HintTooltipProps = {
  text: string
  label?: string
  className?: string
}

function initPrelineTooltips() {
  if (typeof window === 'undefined') return
  const w = window as typeof window & {
    HSStaticMethods?: { autoInit: () => void }
    HSTooltip?: { autoInit: () => void }
  }
  w.HSTooltip?.autoInit?.() ?? w.HSStaticMethods?.autoInit?.()
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
      <span
        className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible invisible absolute z-20 inline-block max-w-xs rounded-lg border border-border-dark bg-surface-elevated-dark px-2.5 py-1.5 text-xs font-normal text-slate-100 opacity-0 shadow-sm transition-opacity"
        role="tooltip"
      >
        {text}
      </span>
    </div>
  )
}
