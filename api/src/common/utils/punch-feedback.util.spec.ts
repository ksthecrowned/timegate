import { describe, expect, test } from 'bun:test';
import {
  formatPunchFeedbackMessage,
  punchReviewReasonLabel,
} from './punch-feedback.util';

describe('punch feedback mobile alignment', () => {
  test('libellés REVIEW connus', () => {
    expect(punchReviewReasonLabel('KIOSK_OTHER_SITE')).toContain('autre site');
    expect(punchReviewReasonLabel('LOCATION_ARCHIVED')).toContain('archivé');
    expect(punchReviewReasonLabel('ASSIGNMENT_EXPIRED')).toContain('expirée');
  });

  test('message ACCEPTED avec lieu', () => {
    const msg = formatPunchFeedbackMessage("Pointage d'arrivee enregistre.", {
      status: 'ACCEPTED',
      locationName: 'Siège',
    });
    expect(msg).toContain('Siège');
    expect(msg).not.toContain('validation');
  });

  test('message REVIEW avec motif', () => {
    const msg = formatPunchFeedbackMessage("Pointage d'arrivee enregistre.", {
      status: 'REVIEW_REQUIRED',
      reviewReasonLabel: 'Pointage sur un autre site',
      locationName: 'Client A',
    });
    expect(msg).toContain('Client A');
    expect(msg).toContain('autre site');
    expect(msg).toContain('validation manager');
  });
});
