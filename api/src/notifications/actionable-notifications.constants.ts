import { TimeGateNotificationType } from '@prisma/client';

/**
 * O — notifications actionnables uniquement.
 * Pas de spam « vient de pointer » vers les managers (déjà garanti côté emit punch).
 *
 * - actionable: défaut ON (in-app + push) — action manager / RH attendue
 * - selfConfirm: confirmation employé du pointage — défaut ON in-app, push OFF
 * - vanity: jamais utiles en v1 — défaut OFF
 */
export const ACTIONABLE_NOTIFICATION_TYPES = new Set<TimeGateNotificationType>([
  TimeGateNotificationType.PUNCH_REVIEW_REQUIRED,
  TimeGateNotificationType.PUNCH_OUTSIDE_WINDOW,
  TimeGateNotificationType.PUNCH_LATE,
  TimeGateNotificationType.ABSENCE_AUTO,
  TimeGateNotificationType.SHIFT_START_MISSING,
  TimeGateNotificationType.UNCLOSED_CHECK_IN,
  TimeGateNotificationType.UNCLOSED_CHECK_IN_REMINDER,
  TimeGateNotificationType.BREAK_RESUME_REMINDER,
  TimeGateNotificationType.BREAK_OVERRUN,
  TimeGateNotificationType.KIOSK_OFFLINE,
  TimeGateNotificationType.VERIFY_FAILURE_SPIKE,
  TimeGateNotificationType.LEAVE_REQUEST_PENDING,
  TimeGateNotificationType.HR_CONTRACT_EXPIRING,
  TimeGateNotificationType.HR_DOCUMENT_MISSING,
  TimeGateNotificationType.OVERTIME_THRESHOLD,
  TimeGateNotificationType.PAYROLL_DUE_SOON,
  TimeGateNotificationType.PAYROLL_OVERDUE,
  TimeGateNotificationType.ASSIGNMENT_EXPIRING,
  TimeGateNotificationType.MISSION_NO_PUNCH,
  TimeGateNotificationType.ANOMALY_BEFORE_PAYROLL,
  TimeGateNotificationType.SUBSCRIPTION_TRIAL_REMINDER,
  TimeGateNotificationType.SUBSCRIPTION_EXPIRING,
  TimeGateNotificationType.SUBSCRIPTION_GRACE,
  TimeGateNotificationType.SUBSCRIPTION_BLOCKED,
  TimeGateNotificationType.SUBSCRIPTION_QUOTA_WARNING,
  TimeGateNotificationType.SUBSCRIPTION_QUOTA_REACHED,
]);

/** Confirmations employé (pas envoyées aux managers). */
export const SELF_CONFIRM_NOTIFICATION_TYPES = new Set<TimeGateNotificationType>([
  TimeGateNotificationType.PUNCH_CHECK_IN,
  TimeGateNotificationType.PUNCH_CHECK_OUT,
  TimeGateNotificationType.PUNCH_BREAK,
  TimeGateNotificationType.LEAVE_APPROVED,
  TimeGateNotificationType.LEAVE_REJECTED,
  TimeGateNotificationType.LEAVE_BALANCE_LOW,
  TimeGateNotificationType.MESSAGE_RECEIVED,
]);

export type NotificationChannelDefaults = {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  policy: 'actionable' | 'self_confirm' | 'off';
};

export function defaultChannelsForType(
  type: TimeGateNotificationType,
): NotificationChannelDefaults {
  if (ACTIONABLE_NOTIFICATION_TYPES.has(type)) {
    return {
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
      policy: 'actionable',
    };
  }
  if (SELF_CONFIRM_NOTIFICATION_TYPES.has(type)) {
    return {
      inAppEnabled: true,
      pushEnabled: false,
      emailEnabled: false,
      policy: 'self_confirm',
    };
  }
  return {
    inAppEnabled: false,
    pushEnabled: false,
    emailEnabled: false,
    policy: 'off',
  };
}
