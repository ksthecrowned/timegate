import { describe, expect, it } from 'bun:test';
import { workDateUtcFromOccurredAt } from './punch-time.util';

describe('workDateUtcFromOccurredAt', () => {
  it('uses org local calendar day near UTC midnight (Africa/Brazzaville UTC+1)', () => {
    // 2026-03-24 23:30 UTC = 2026-03-25 00:30 in Brazzaville
    const at = new Date('2026-03-24T23:30:00.000Z');
    const day = workDateUtcFromOccurredAt(at, 'Africa/Brazzaville');
    expect(day.toISOString().slice(0, 10)).toBe('2026-03-25');
  });

  it('keeps same UTC date when already morning UTC', () => {
    const at = new Date('2026-03-25T08:00:00.000Z');
    const day = workDateUtcFromOccurredAt(at, 'Africa/Brazzaville');
    expect(day.toISOString().slice(0, 10)).toBe('2026-03-25');
  });
});
