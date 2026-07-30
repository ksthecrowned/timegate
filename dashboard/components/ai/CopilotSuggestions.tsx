'use client'

import { useSession } from 'next-auth/react'

const SUGGESTIONS = [
  'Absents aujourd’hui',
  'Validations en attente',
  'Retards cette semaine',
  'Kiosks offline',
  'Top heures sup ce mois',
]

const ADMIN_SUGGESTIONS = [
  'Qui n’a pas été payé à Brazzaville ?',
  'Masse juillet vs juin',
]

export default function CopilotSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const suggestions = isAdmin ? [...SUGGESTIONS, ...ADMIN_SUGGESTIONS] : SUGGESTIONS

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-700 hover:border-primary/40 hover:text-primary dark:border-border-dark dark:bg-surface-elevated-dark dark:text-slate-200"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
