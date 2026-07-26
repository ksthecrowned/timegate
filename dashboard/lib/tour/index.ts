export type {
  TourPersistedState,
  TourRole,
  TourStatus,
  TourStep,
  TourStepType,
} from './types'
export {
  clearTourState,
  loadTourState,
  saveTourState,
  storageKey,
} from './storage'
export { ORG_SAVED_EVENT, emitOrgSaved, onOrgSaved } from './events'
export {
  createTourController,
  type TourController,
  type TourProgress,
  type TourRouter,
} from './controller'
export { filterAvailableSteps, progressLabel } from './helpers'
export { dashboardTourSteps } from './catalogs/dashboard'
export { adminTourSteps } from './catalogs/admin'
export { managerTourSteps } from './catalogs/manager'

import type { TourRole, TourStep } from './types'
import { adminTourSteps } from './catalogs/admin'
import { managerTourSteps } from './catalogs/manager'

export function getTourStepsForRole(role: TourRole): TourStep[] {
  return role === 'ADMIN' ? adminTourSteps : managerTourSteps
}
