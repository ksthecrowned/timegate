import type { TourPersistedState, TourRole } from './types'

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null
    const ls = (globalThis as { localStorage?: Storage }).localStorage
    return ls ?? null
  } catch {
    return null
  }
}

export function storageKey(userId: string, role: TourRole): string {
  return `timegate.dashboard.tour.v2:${userId}:${role}`
}

export function loadTourState(
  userId: string,
  role: TourRole,
): TourPersistedState | null {
  const ls = getLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(storageKey(userId, role))
    if (!raw) return null
    return JSON.parse(raw) as TourPersistedState
  } catch {
    return null
  }
}

export function saveTourState(
  userId: string,
  role: TourRole,
  state: TourPersistedState,
): void {
  const ls = getLocalStorage()
  if (!ls) return
  try {
    ls.setItem(storageKey(userId, role), JSON.stringify(state))
  } catch {
    // private mode / quota
  }
}

export function clearTourState(userId: string, role: TourRole): void {
  const ls = getLocalStorage()
  if (!ls) return
  try {
    ls.removeItem(storageKey(userId, role))
  } catch {
    // ignore
  }
}
