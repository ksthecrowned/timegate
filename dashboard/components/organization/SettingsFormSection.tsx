'use client'

import { HintTooltip } from '@/components/ui/HintTooltip'

/** Section de formulaire pleine largeur (paramètres organisation). */
export function SettingsFormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="md:col-span-2 border-t border-slate-200/80 pt-5 dark:border-border-dark">
      <h3 className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-neutral-200">
        {title}
        {hint ? <HintTooltip text={hint} /> : null}
      </h3>
      {children}
    </div>
  )
}
