import { resolveNotificationHref } from '../lib/notificationDeepLink';

describe('resolveNotificationHref', () => {
  it('routes leave notifications to /leave', () => {
    expect(resolveNotificationHref({ type: 'LEAVE_APPROVED' })).toBe('/leave');
    expect(resolveNotificationHref({ type: 'LEAVE_REJECTED' })).toBe('/leave');
  });

  it('routes break reminders to /break-resume', () => {
    expect(resolveNotificationHref({ type: 'BREAK_RESUME_REMINDER' })).toBe(
      '/break-resume',
    );
    expect(resolveNotificationHref({ type: 'BREAK_OVERRUN' })).toBe(
      '/break-resume',
    );
  });

  it('routes punch events to /attendance', () => {
    expect(resolveNotificationHref({ type: 'PUNCH_CHECK_IN' })).toBe(
      '/attendance',
    );
  });

  it('routes MESSAGE_RECEIVED to conversation when id present', () => {
    expect(
      resolveNotificationHref({
        type: 'MESSAGE_RECEIVED',
        data: { conversationId: 'conv-abc' },
      }),
    ).toBe('/messages/conv-abc');
    expect(resolveNotificationHref({ type: 'MESSAGE_RECEIVED' })).toBe(
      '/messages',
    );
  });

  it('falls back to /notifications', () => {
    expect(resolveNotificationHref({ type: 'UNKNOWN' })).toBe('/notifications');
    expect(resolveNotificationHref({})).toBe('/notifications');
  });
});
