'use client'

import { useCopilot } from '@/components/ai/CopilotProvider'

export default function CopilotNavButton() {
  const { toggle, canUseCopilot } = useCopilot()
  if (!canUseCopilot) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title="TimeGate Copilot"
      className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M5 19l1 2 2 1-2 1-1 2-1-2-2-1 1-2z" />
      </svg>
      <span className="hidden sm:inline">Copilot</span>
    </button>
  )
}
