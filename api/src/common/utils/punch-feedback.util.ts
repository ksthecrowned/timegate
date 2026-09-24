/**
 * Libellés produit pour feedback mobile (employee-app / kiosk-app).
 * Codes = meta.autoReviewReason côté événement.
 */

export type PunchReviewReasonCode =
  | 'KIOSK_OTHER_SITE'
  | 'LOCATION_ARCHIVED'
  | 'ASSIGNMENT_EXPIRED'
  | 'LATE_CHECKIN'
  | 'LOW_CONFIDENCE';

export type PunchLocationSummary = {
  id: string;
  name: string;
  type: string;
  clientLabel: string | null;
};

export function punchReviewReasonLabel(
  code: string | undefined | null,
  opts?: { wrongSite?: boolean },
): string | null {
  if (opts?.wrongSite || code === 'KIOSK_OTHER_SITE') {
    return 'Pointage sur un autre site';
  }
  switch (code) {
    case 'LOCATION_ARCHIVED':
      return 'Lieu archivé — pointage en validation';
    case 'ASSIGNMENT_EXPIRED':
      return 'Affectation expirée sur ce lieu';
    case 'LATE_CHECKIN':
      return 'Arrivée en retard';
    case 'LOW_CONFIDENCE':
      return 'Confiance faciale insuffisante';
    default:
      return code ? 'Validation requise' : null;
  }
}

export function formatPunchFeedbackMessage(
  baseMessage: string,
  params: {
    status: string;
    reviewReasonLabel?: string | null;
    locationName?: string | null;
  },
): string {
  const parts = [baseMessage];
  if (params.locationName) {
    parts.push(`Lieu : ${params.locationName}`);
  }
  if (params.status === 'REVIEW_REQUIRED') {
    if (params.reviewReasonLabel) {
      parts.push(params.reviewReasonLabel);
    }
    parts.push('En attente de validation manager.');
  }
  return parts.filter(Boolean).join(' ');
}
