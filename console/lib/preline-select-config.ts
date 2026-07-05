/** Shared HSSelect config — https://preline.co/docs/advanced-select.html */

type HSSelectInstance = { destroy?: () => void }

type HSSelectCtor = {
  new (el: HTMLSelectElement): HSSelectInstance
  getInstance: (target: HTMLElement | string, isInstance?: boolean) => HSSelectInstance | null
}

declare global {
  interface Window {
    $hsSelectCollection?: Array<{ element: { el: HTMLSelectElement; destroy?: () => void } }>
  }
}

const PRELINE_SELECT_BASE = {
  toggleTag: '<button type="button" aria-expanded="false"><span data-title></span></button>',
  toggleClasses:
    'hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative py-3 ps-4 pe-9 flex gap-x-2 w-full min-w-0 cursor-pointer bg-surface-card border border-slate-200 text-slate-800 rounded-lg text-start text-sm hover:bg-slate-50 focus:outline-hidden focus:bg-slate-50 dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-300 dark:hover:bg-surface-card-dark dark:focus:bg-surface-card-dark [&>span]:truncate',
  dropdownClasses:
    'mt-2 z-[100] min-w-[var(--select-toggle-width,100%)] w-full max-h-72 p-1 space-y-0.5 bg-surface-card border border-slate-200 rounded-lg shadow-lg overflow-hidden overflow-y-auto dark:bg-surface-card-dark dark:border-border-dark [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600',
  optionClasses:
    'py-2 px-4 w-full text-sm text-slate-800 cursor-pointer hover:bg-primary/10 rounded-lg focus:outline-hidden focus:bg-primary/10 hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 dark:text-slate-200 dark:hover:bg-primary/15 dark:focus:bg-primary/15',
  optionTemplate:
    '<div class="flex justify-between items-center w-full"><span data-title></span><span class="hidden hs-selected:block"><svg class="shrink-0 size-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></div>',
  extraMarkup:
    '<div class="absolute top-1/2 inset-e-3 -translate-y-1/2 pointer-events-none"><svg class="shrink-0 size-3.5 text-gray-500 dark:text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>',
  dropdownVerticalFixedPlacement: 'bottom' as const,
}

let hsSelectCtorPromise: Promise<HSSelectCtor | null> | null = null

function ensureHsSelectGlobals(): void {
  if (typeof window === 'undefined') return
  if (!window.$hsSelectCollection) window.$hsSelectCollection = []
}

async function loadHSSelect(): Promise<HSSelectCtor | null> {
  if (!hsSelectCtorPromise) {
    hsSelectCtorPromise = (async () => {
      try {
        const preline = await import('preline')
        const fromMain = (preline as { HSSelect?: HSSelectCtor }).HSSelect
        if (fromMain?.getInstance) return fromMain

        const selectMod = await import('preline/plugins/select')
        const fromPlugin = (selectMod as { default?: HSSelectCtor }).default
        if (fromPlugin?.getInstance) return fromPlugin
      } catch {
        // Preline may be provided by the CDN script instead of the npm bundle.
      }

      if (typeof window !== 'undefined') {
        const fromWindow = (window as Window & { HSSelect?: HSSelectCtor }).HSSelect
        if (fromWindow?.getInstance) return fromWindow
      }

      return null
    })()
  }
  return hsSelectCtorPromise
}

function cleanupSelectDom(el: HTMLSelectElement): void {
  const host = el.parentElement?.parentElement
  if (!host) return

  const wrapper = host.querySelector('.hs-select')
  if (!wrapper) return

  el.classList.add('hidden')
  el.style.display = ''
  host.prepend(el)
  wrapper.remove()
}

export function buildHsSelectConfig(options: {
  placeholder?: string
  hasSearch?: boolean
  searchPlaceholder?: string
  optionAllowEmptyOption?: boolean
  error?: boolean
}): string {
  const errorClasses = options.error ? ' border-red-400 ring-2 ring-red-400' : ''
  return JSON.stringify({
    ...PRELINE_SELECT_BASE,
    toggleClasses: PRELINE_SELECT_BASE.toggleClasses + errorClasses,
    placeholder: options.placeholder ?? 'Sélectionner…',
    hasSearch: options.hasSearch ?? false,
    searchPlaceholder: options.searchPlaceholder ?? 'Rechercher…',
    optionAllowEmptyOption: options.optionAllowEmptyOption ?? false,
  })
}

export async function initPrelineSelect(el: HTMLSelectElement): Promise<boolean> {
  const HSSelect = await loadHSSelect()
  if (!HSSelect?.getInstance) return false

  ensureHsSelectGlobals()

  const existing = HSSelect.getInstance(el, true)
  if (existing?.destroy) existing.destroy()

  new HSSelect(el)
  return true
}

export async function destroyPrelineSelect(el: HTMLSelectElement): Promise<void> {
  ensureHsSelectGlobals()

  try {
    const HSSelect = await loadHSSelect()
    if (!HSSelect?.getInstance) {
      cleanupSelectDom(el)
      return
    }

    const existing = HSSelect.getInstance(el, true)
    if (existing?.destroy) {
      existing.destroy()
      return
    }
  } catch {
    // Fall through to manual DOM cleanup.
  }

  cleanupSelectDom(el)
}

export async function runPrelineAutoInit() {
  const preline = await import('preline')
  const autoInit =
    (preline as { HSStaticMethods?: { autoInit?: () => void } }).HSStaticMethods?.autoInit ??
    (preline as { default?: { autoInit?: () => void } }).default?.autoInit
  autoInit?.()
}
