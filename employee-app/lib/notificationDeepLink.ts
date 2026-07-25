/**
 * Maps notification type (+ optional meta/data) to an in-app route.
 * Used by the notifications list and push tap handlers.
 */
export type NotificationNavInput = {
  type?: string | null;
  meta?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
};

export function resolveNotificationHref(input: NotificationNavInput): string {
  const data = {
    ...(asStringRecord(input.meta) ?? {}),
    ...(asStringRecord(input.data) ?? {}),
  };
  const type =
    input.type ||
    (typeof data.notificationType === 'string' ? data.notificationType : null) ||
    (typeof data.type === 'string' ? data.type : null) ||
    '';

  switch (type) {
    case 'LEAVE_APPROVED':
    case 'LEAVE_REJECTED':
    case 'LEAVE_REQUEST_PENDING':
      return '/leave';
    case 'LEAVE_BALANCE_LOW':
      return '/leave-balances';
    case 'BREAK_RESUME_REMINDER':
    case 'BREAK_OVERRUN':
      return '/break-resume';
    case 'PUNCH_CHECK_IN':
    case 'PUNCH_CHECK_OUT':
    case 'PUNCH_BREAK':
    case 'PUNCH_REVIEW_REQUIRED':
    case 'PUNCH_OUTSIDE_WINDOW':
    case 'PUNCH_LATE':
    case 'UNCLOSED_CHECK_IN':
    case 'UNCLOSED_CHECK_IN_REMINDER':
    case 'ABSENCE_AUTO':
      return '/attendance';
    case 'HR_CONTRACT_EXPIRING':
    case 'HR_DOCUMENT_MISSING':
      return '/contracts';
    case 'OVERTIME_THRESHOLD':
      return '/planning';
    default:
      return '/notifications';
  }
}

function asStringRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}
