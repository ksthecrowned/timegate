/** Libellés FR pour les types de notification TimeGate. */
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  PUNCH_CHECK_IN: 'Pointage — entrée',
  PUNCH_CHECK_OUT: 'Pointage — sortie',
  PUNCH_BREAK: 'Pointage — pause',
  PUNCH_REVIEW_REQUIRED: 'Pointage à valider',
  PUNCH_OUTSIDE_WINDOW: 'Pointage hors fenêtre',
  PUNCH_LATE: 'Retard au pointage',
  ABSENCE_AUTO: 'Absence détectée',
  UNCLOSED_CHECK_IN: 'Entrée non clôturée',
  UNCLOSED_CHECK_IN_REMINDER: 'Rappel — sortie oubliée',
  BREAK_RESUME_REMINDER: 'Rappel — reprise après pause',
  BREAK_OVERRUN: 'Pause dépassée',
  KIOSK_OFFLINE: 'Kiosque hors ligne',
  VERIFY_FAILURE_SPIKE: 'Pic d’échecs de vérification',
  SUBSCRIPTION_TRIAL_REMINDER: 'Abonnement — rappel essai',
  SUBSCRIPTION_EXPIRING: 'Abonnement — expiration proche',
  SUBSCRIPTION_GRACE: 'Abonnement — période de grâce',
  SUBSCRIPTION_BLOCKED: 'Abonnement — bloqué',
  SUBSCRIPTION_QUOTA_WARNING: 'Abonnement — quota bientôt atteint',
  SUBSCRIPTION_QUOTA_REACHED: 'Abonnement — quota atteint',
  LEAVE_REQUEST_PENDING: 'Congé — demande en attente',
  LEAVE_APPROVED: 'Congé — approuvé',
  LEAVE_REJECTED: 'Congé — refusé',
  LEAVE_BALANCE_LOW: 'Congé — solde bas',
  HR_CONTRACT_EXPIRING: 'RH — contrat bientôt expiré',
  HR_DOCUMENT_MISSING: 'RH — document manquant',
  OVERTIME_THRESHOLD: 'Heures supplémentaires — seuil',
}

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type.replaceAll('_', ' ').toLowerCase()
}
