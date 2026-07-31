'use client'

import { useSession } from 'next-auth/react'

const SUGGESTIONS = [
  {
    label: 'Comment va l’entreprise ?',
    prompt: 'Comment se porte l’entreprise en ce moment ? Donne-moi une vue d’ensemble.',
  },
  {
    label: 'Point sur mon équipe',
    prompt: 'Comment se porte mon équipe aujourd’hui ? Présence, absences, points d’attention.',
  },
  {
    label: 'Y a-t-il des alertes ?',
    prompt: 'Qu’est-ce qui mérite mon attention en ce moment ? Alertes, anomalies, urgences.',
  },
  {
    label: 'Tendance de la semaine',
    prompt: 'Comment s’est passée la semaine côté présence et retards ? Qu’est-ce qui ressort ?',
  },
]

const ADMIN_SUGGESTIONS = [
  {
    label: 'Santé RH globale',
    prompt:
      'Donne-moi un bilan RH de l’organisation : effectifs, présence, congés, et ce qui cloche.',
  },
  {
    label: 'Paie & risques',
    prompt:
      'Comment se porte la paie en ce moment ? Impayés, retards de cycle, points de vigilance.',
  },
]

export default function CopilotSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const suggestions = isAdmin ? [...SUGGESTIONS, ...ADMIN_SUGGESTIONS] : SUGGESTIONS

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Pour commencer
      </p>
      <div className="grid gap-2">
        {suggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.prompt)}
            className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-left text-sm font-medium text-slate-700 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-border-dark dark:bg-surface-card-dark dark:text-slate-200 dark:hover:bg-primary/10 dark:hover:text-teal-300"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
