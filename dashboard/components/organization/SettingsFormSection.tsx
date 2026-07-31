'use client'

import { HintTooltip } from '@/components/ui/HintTooltip'

/** Section de paramètres — panneau autonome pour grilles 1/2 colonnes. */
export function SettingsFormSection({
  title,
  hint,
  children,
  className = '',
}: {
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 md:p-5 dark:border-border-dark dark:bg-white/3 ${className}`.trim()}
    >
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-neutral-200">
        {title}
        {hint ? <HintTooltip text={hint} /> : null}
      </h3>
      <div className="mt-4 flex flex-1 flex-col gap-4">{children}</div>
    </section>
  )
}
