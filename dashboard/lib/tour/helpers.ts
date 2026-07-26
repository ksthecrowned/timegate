import { isElementVisible } from './dom'
import type { TourStep } from './types'

export function filterAvailableSteps(
  steps: TourStep[],
  queryFn: (selector: string) => Element | null = (s) =>
    typeof document !== 'undefined' ? document.querySelector(s) : null,
): TourStep[] {
  return steps.filter((step) => {
    if (!step.element) return true
    if (step.type === 'navigate' || (step.type === 'requireSave' && step.path)) {
      return true
    }
    const el = queryFn(step.element)
    if (!el) {
      return Boolean(step.required)
    }
    if (typeof window === 'undefined') return true
    return isElementVisible(el) || Boolean(step.required)
  })
}

export function progressLabel(step: TourStep, index: number, total: number): string {
  return `${step.module} · ${index + 1}/${total}`
}
