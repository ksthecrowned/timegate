export type TourRole = 'ADMIN' | 'MANAGER'

export type TourStepType =
  | 'spotlight'
  | 'navigate'
  | 'awaitAction'
  | 'requireSave'
  | 'celebrate'

export type TourStep = {
  id: string
  type: TourStepType
  /** Module label for progress chip, e.g. "Dashboard" */
  module: string
  title: string
  description: string
  /** CSS selector; omit for celebrate / centered welcome */
  element?: string
  path?: string
  /** Selector that must be clicked (awaitAction) */
  actionSelector?: string
  /** Event name to wait for (requireSave), default tour:org-saved */
  saveEvent?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** If true, missing element fails hard instead of soft-skip */
  required?: boolean
}

export type TourStatus = 'idle' | 'running' | 'completed' | 'dismissed'

export type TourPersistedState = {
  status: TourStatus
  stepId: string | null
  orgSetupSkipped?: boolean
  orgReminderShown?: boolean
  updatedAt: string
}
