'use client'

import { useCopilot } from '@/components/ai/CopilotProvider'

export default function CopilotNavButton() {
  const { toggle, open, canUseCopilot } = useCopilot()
  if (!canUseCopilot) return null

  return (
    <button
      type="button"
      data-tour="copilot"
      onClick={toggle}
      title="TMG Copilot"
      aria-pressed={open}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors',
        open
          ? 'bg-primary text-white'
          : 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:text-teal-300 dark:hover:bg-primary/25',
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex size-4 items-center justify-center rounded text-[8px] font-bold leading-none',
          open ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary dark:text-teal-300',
        ].join(' ')}
      >
        AI
      </span>
      <span className="hidden sm:inline">Copilot</span>
    </button>
  )
}
