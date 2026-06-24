/**
 * Tiny global event bus for cross-screen auth state changes.
 * Used by `fetchApi` (on 401) to broadcast logout and by the root layout
 * to navigate to /login without prop-drilling.
 */

const AUTH_LOGOUT_EVENT = 'auth:logout';

const target =
  typeof globalThis !== 'undefined' && 'EventTarget' in globalThis
    ? new EventTarget()
    : null;

export function dispatchLogout(): void {
  if (!target) return;
  target.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export function onLogout(handler: () => void): () => void {
  if (!target) return () => undefined;
  target.addEventListener(AUTH_LOGOUT_EVENT, handler);
  return () => target.removeEventListener(AUTH_LOGOUT_EVENT, handler);
}