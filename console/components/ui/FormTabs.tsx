'use client'

import { HintTooltip } from '@/components/ui/HintTooltip'
import type { ReactNode } from 'react'

export type FormTabItem = {
  id: string
  label: string
  hint?: string
  content: ReactNode | (() => ReactNode)
}

type FormTabsProps = {
  tabs: FormTabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  /** Étend la barre d’onglets sur toute la largeur du conteneur parent (FormCard). */
  flush?: boolean
}

const tabButtonClass = (active: boolean) =>
  `py-3 px-4 inline-flex items-center gap-x-2 border-b-2 text-sm font-medium transition-colors ${
    active
      ? 'border-primary text-primary'
      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200'
  }`

function renderTabContent(content: ReactNode | (() => ReactNode)) {
  return typeof content === 'function' ? content() : content
}

export default function FormTabs({ tabs, activeTab, onTabChange, flush = true }: FormTabsProps) {
  const active = tabs.find((tab) => tab.id === activeTab)

  return (
    <div>
      <div
        className={
          flush
            ? 'border-b border-slate-200/80 -mx-4 md:-mx-5 px-4 md:px-5 dark:border-border-dark'
            : 'border-b border-gray-200 dark:border-neutral-700'
        }
      >
        <nav className="flex flex-wrap gap-x-1 -mb-px" role="tablist" aria-label="Sections du formulaire">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={tabButtonClass(activeTab === tab.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                {tab.label}
                {tab.hint ? <HintTooltip text={tab.hint} /> : null}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-5 overflow-visible" role="tabpanel">
        {active ? renderTabContent(active.content) : null}
      </div>
    </div>
  )
}
