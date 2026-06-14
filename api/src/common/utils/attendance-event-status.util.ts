import { TimeGateAttendanceEventStatus } from '@prisma/client';

export type AttendanceEventStatusResolution = {
  status: TimeGateAttendanceEventStatus;
  autoReviewReason?: string;
};

/** Détermine ACCEPTED vs REVIEW_REQUIRED à partir du score face et des seuils tenant. */
export function resolveAttendanceEventStatus(
  confidence: number,
  minAcceptConfidence: number,
  matchFloor: number,
): AttendanceEventStatusResolution {
  if (confidence >= minAcceptConfidence) {
    return { status: TimeGateAttendanceEventStatus.ACCEPTED };
  }
  if (confidence >= matchFloor) {
    return {
      status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
      autoReviewReason: 'confidence_below_min_accept',
    };
  }
  return {
    status: TimeGateAttendanceEventStatus.REVIEW_REQUIRED,
    autoReviewReason: 'confidence_below_match_floor',
  };
}
