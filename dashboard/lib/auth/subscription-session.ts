import type { SubscriptionStatus } from '@/lib/timegate/types'

/** Champs session dérivés de GET /auth/subscription-status. */
export function mapSubscriptionSessionFields(subscription: SubscriptionStatus) {
  const canAccessApp = !subscription.blocked
  return {
    subscriptionActive: canAccessApp,
    subscriptionReadOnly: subscription.readOnly,
    subscriptionBlocked: subscription.blocked,
    subscriptionStatus: subscription.status,
  }
}
