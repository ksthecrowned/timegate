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
        className="hs-tooltip-toggle inline-flex shrink-0 hover:text-gray-600 focus:outline-none dark:hover:text-neutral-300 text-slate-200/80  dark:text-border-dark"
        aria-label={label}
      >
        <Info className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span
        className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible invisible absolute z-20 inline-block max-w-xs rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-normal text-white opacity-0 shadow-sm transition-opacity dark:bg-neutral-700"
        role="tooltip"
      >
        {text}
      </span>
    </div>
  )
}
