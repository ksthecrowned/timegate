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

export function planLabel(plan?: string | null): string {
  if (!plan) return 'Abonnement'
  return PLAN_LABELS[plan.toUpperCase()] ?? plan
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
