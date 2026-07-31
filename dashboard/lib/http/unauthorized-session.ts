/** Émis côté navigateur quand une requête authentifiée reçoit un 401. */
export const UNAUTHORIZED_SESSION_EVENT = 'timegate:unauthorized-session'

let logoutScheduled = false

/**
 * Déclenche la déconnexion de session (via AuthSessionGuard).
 * No-op côté serveur. Idempotent tant que la session n’est pas rétablie.
 */
export function notifyUnauthorizedSession(): void {
  if (typeof window === 'undefined') return
  if (logoutScheduled) return
  logoutScheduled = true
  window.dispatchEvent(new Event(UNAUTHORIZED_SESSION_EVENT))
}

/** À appeler quand une session valide est de nouveau active. */
export function clearUnauthorizedSessionLock(): void {
  logoutScheduled = false
}
