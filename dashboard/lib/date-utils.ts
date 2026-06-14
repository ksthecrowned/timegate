/** Formate une date pour l'affichage (fr-FR). */
export function formatDisplayDate(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Convertit une Date en chaîne ISO `YYYY-MM-DD` (format API). */
export function toIsoDate(date: Date | null | undefined): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse une chaîne ISO `YYYY-MM-DD` en Date locale (sans décalage UTC). */
export function fromIsoDate(iso: string): Date | null {
  if (!iso) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

/** Extrait `YYYY-MM-DD` depuis une date API (ISO complète ou date seule). */
export function normalizeApiDate(value: string | null | undefined): string {
  if (!value) return ''
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  return match?.[1] ?? ''
}

/** Parse une date API en Date locale (jour civil, sans décalage UTC). */
export function parseApiDate(value: string | null | undefined): Date | null {
  const normalized = normalizeApiDate(value)
  if (normalized) return fromIsoDate(normalized)
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

/** Affiche une date API au format `jj/mm/aaaa`. */
export function formatApiDate(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return formatDisplayDate(date)
}

/** Affiche une date API au format long (ex. « mercredi 1 janvier 2026 »). */
export function formatApiDateLong(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Affiche une date API au format court (ex. « mer. 1 janv. »). */
export function formatApiDateShort(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Affiche une date/heure API au format `jj/mm/aaaa, hh:mm`. */
export function formatApiDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
