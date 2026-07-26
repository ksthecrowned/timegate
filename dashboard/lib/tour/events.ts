export const ORG_SAVED_EVENT = 'tour:org-saved'

export function emitOrgSaved(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ORG_SAVED_EVENT))
}

export function onOrgSaved(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const listener = () => handler()
  window.addEventListener(ORG_SAVED_EVENT, listener)
  return () => window.removeEventListener(ORG_SAVED_EVENT, listener)
}
