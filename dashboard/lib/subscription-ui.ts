import type { SubscriptionStatus } from '@/lib/timegate/types'

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Essai gratuit',
  STARTER: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

const UPGRADE_TARGET: Record<string, string> = {
  TRIAL: 'Pro',
  STARTER: 'Pro',
  PRO: 'Enterprise',
}

const SOURCE_LABELS: Record<string, string> = {
  SELF_SIGNUP: 'Inscription',
  ACTIVATION_KEY: 'Clé d’activation',
  MANUAL: 'Manuel',
}

export function planLabel(plan?: string | null): string {
  if (!plan) return 'Abonnement'
  return PLAN_LABELS[plan.toUpperCase()] ?? plan
}

export function subscriptionSourceLabel(source?: string | null): string {
  if (!source) return '—'
  return SOURCE_LABELS[source.toUpperCase()] ?? source
}

export function upgradeTargetPlan(plan?: string | null): string | null {
  if (!plan) return 'Pro'
  const target = UPGRADE_TARGET[plan.toUpperCase()]
  return target ?? null
}

export function subscriptionStatusLabel(status: SubscriptionStatus['status']): string {
  switch (status) {
    case 'TRIAL':
      return 'Essai gratuit'
    case 'ACTIVE':
      return 'Actif'
    case 'GRACE_READ_ONLY':
      return 'Grâce (lecture seule)'
    case 'BLOCKED':
      return 'Expiré'
    case 'SUSPENDED':
      return 'Suspendu'
    default:
      return 'Abonnement'
  }
}

/** Libellés courts pour la sidebar. */
export function subscriptionStatusShortLabel(status: SubscriptionStatus['status']): string {
  switch (status) {
    case 'TRIAL':
      return 'Essai'
    case 'ACTIVE':
      return 'Actif'
    case 'GRACE_READ_ONLY':
      return 'Grâce'
    case 'BLOCKED':
      return 'Expiré'
    case 'SUSPENDED':
      return 'Suspendu'
    default:
      return 'Abo'
  }
}

export function formatDaysRemaining(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 0) return 'Échu'
  if (days === 0) return "Aujourd'hui"
  return `${days} jour${days > 1 ? 's' : ''}`
}
