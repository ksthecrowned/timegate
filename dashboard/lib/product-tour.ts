import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export const PRODUCT_TOUR_STORAGE_KEY = 'timegate.dashboard.tour.v1'

const ALL_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Bienvenue sur TimeGate',
      description:
        'Visite rapide du tableau de bord : navigation, recherche, alertes et indicateurs du jour.',
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Menu de navigation',
      description:
        'Accédez aux modules RH : employés, pointage, congés, planning, paie et configuration.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="search"]',
    popover: {
      title: 'Recherche globale',
      description: 'Retrouvez rapidement un employé, une branche, un département ou un kiosque.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="notifications"]',
    popover: {
      title: 'Notifications',
      description: 'Suivez les alertes (congés, pointages, kiosques) sans quitter le dashboard.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="copilot"]',
    popover: {
      title: 'Copilot IA',
      description: 'Posez des questions sur vos données RH et laissez l’assistant vous guider.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="home-today"]',
    popover: {
      title: 'Aujourd’hui',
      description: 'Présents, absents, retards et éléments à valider — le pulse opérationnel du jour.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="home-quick"]',
    popover: {
      title: 'Accès rapide',
      description: 'Raccourcis vers les écrans que vous utilisez le plus souvent.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="plan-widget"]',
    popover: {
      title: 'Votre abonnement',
      description: 'Consultez votre offre, les quotas et activez une clé si besoin.',
      side: 'top',
      align: 'start',
    },
  },
]

function availableSteps(): DriveStep[] {
  return ALL_STEPS.filter((step) => {
    if (!step.element) return true
    const el =
      typeof step.element === 'string'
        ? document.querySelector(step.element)
        : step.element
    if (!el) return false
    const style = window.getComputedStyle(el as Element)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

export function hasCompletedProductTour(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(PRODUCT_TOUR_STORAGE_KEY) === 'done'
  } catch {
    return true
  }
}

export function markProductTourCompleted(): void {
  try {
    localStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, 'done')
  } catch {
    // ignore quota / private mode
  }
}

/** Starts the guided tour. Client-only. */
export function startProductTour(options?: { force?: boolean }): void {
  if (typeof window === 'undefined') return
  if (!options?.force && hasCompletedProductTour()) return

  const steps = availableSteps()
  if (steps.length === 0) return

  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayOpacity: 0.55,
    overlayColor: '#0b1120',
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: 'tg-driver-popover',
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent',
    doneBtnText: 'Terminer',
    progressText: '{{current}} / {{total}}',
    steps,
    onDestroyed: () => {
      markProductTourCompleted()
    },
  })

  driverObj.drive()
}
